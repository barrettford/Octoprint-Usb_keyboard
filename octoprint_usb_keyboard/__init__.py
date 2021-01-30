# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import octoprint.printer
import re
import json
import requests
import sys
import time
if sys.platform.startswith("linux"):
  from .keyboard_listener_evdev import KeyboardListenerThread 
else:
  from .keyboard_listener_pynput import KeyboardListenerThread 
from octoprint.events import eventManager


class Usb_keyboardPlugin(octoprint.plugin.StartupPlugin,
                         octoprint.plugin.ShutdownPlugin,
                         octoprint.plugin.SettingsPlugin,
                         octoprint.plugin.SimpleApiPlugin,
                         octoprint.plugin.EventHandlerPlugin,
                         octoprint.plugin.AssetPlugin,
                         octoprint.plugin.TemplatePlugin):

  ##~~EventHandlerPlugin mixin
  
  # def on_event(self, event, payload):
  #   self._logger.info(f"********* ON EVENT ********** {event}")
    
  def variable_sub(self, command):
    if not command:
      return command
    sub_command = command
    vars_found = re.findall("<.*>", sub_command)
    
    if vars_found:
      for variable in vars_found:
        # print(f"variable '{variable}'")
        clean_variable = variable[1:-1]
        setting_var = self._profiles.get(self._active_profile_name, {}).get("variables", {})[clean_variable]
        if setting_var is not None:
          sub_command = sub_command.replace(variable, str(setting_var))
        else:
          self._logger.error(f"No value for variable '{clean_variable}'... Is this intentional?")
          return None
    return sub_command
    
  def send_key_discovery(self, data):
    self._plugin_manager.send_plugin_message(self._identifier, data)
  

  ## It's better to subscribe to our event than to get them all and ignore most.
  def _key_event(self, event, payload):
    # self._logger.info(f"********* SUBSCRIBE ********** {event}")
    key = payload["key"]
    key_state = payload["key_state"]
    
    
    if self._active_listening:
      if time.time() - self._active_listening_start > 10 * 60:
        self._active_listening_start = False
      else:
        self._plugin_manager.send_plugin_message(self._identifier, {"key":key, "key_state":key_state, "reply":"active_listening"})
    
    
    # print(all_events())
    if key_state == "pressed":
      self.last_key_pressed = key
      if self.key_discovery:
        self._logger.debug(f"Key Discovery '{self.key_discovery}'")
        
        self.key_discovery["name"] = key
        self.key_discovery["reply"] = "key_discovery"
        self._logger.debug(f"Frontend asked for key, detecting keypress '{key}'")
        self.send_key_discovery(self.key_discovery)
        self.key_discovery = {}
        return
    
    
    # self._logger.info(f"Key '{key}' {key_state}")
    
    commands = self._profiles.get(self._active_profile_name, {}).get("commands", [])
    if not commands:
      # self._logger.info("Commands Empty......")
      return
      
    # "KP1":    {"pressed": [{"type":"printer", "gcode":["G0 X10 Y10 F6000"]}],                  "variable_values": {"distance":"1"}     }
      
    key_actions = commands.get(key)
    if not key_actions:
      return
      
    # {"pressed": [{"type":"printer", "gcode":["G0 X10 Y10 F6000"]}],                  "variable_values": {"distance":"1"}
    
    
    state_key_actions = key_actions.get(key_state, {})
    #[{"type":"printer", "gcode":["G0 X10 Y10 F6000"]}, {"type":"printer", "gcode":["G0 X10 Y10 F6000"]}]
    
    for current_action in state_key_actions:
      # {"type":"printer", "gcode":["G0 X10 Y10 F6000"]}
      current_action_type = current_action.get("type")
      if not current_action_type:
        self._logger.debug(f"Found action with no type! Guess we do nothing...")
        continue
      
      
      # ------------------ Octoprint -------------------
      # {"type":"octoprint", "command":"cancel_print", "presses_required":1}
      if current_action_type == "octoprint":
        # "command":"cancel_print"
        command = current_action.get("command")
        presses_required = current_action.get("presses_required", 1)
        
        self._logger.debug(f"Found octoprint command '{command}' for key '{key}'.")
        
        if command == "confirm_last_command":
          command = self.octoprint_last_command;
          command_presses = -1
          self.octoprint_last_command = None
          self.octoprint_last_command_presses = 0
        else:
          if command == self.octoprint_last_command:
            command_presses = self.octoprint_last_command_presses + 1
          else:
            command_presses = 1
        
        if command and (command_presses < 0 or command_presses >= presses_required):
          if command == "cancel_print":
            self._printer.cancel_print()
          elif command == "pause_print":
            self._printer.pause_print()
          elif command == "resume_print":
            self._printer.resume_print()
          elif command == "start_print":
            self._printer.start_print()
          elif command == "toggle_pause_print":
            self._printer.toggle_pause_print()
          else:
            self._logger.error(f"No action defined for octoprint command '{command}'!")
        else:
          self.octoprint_last_command = command
          self.octoprint_last_command_presses = command_presses
        continue # Go around again, nothing else to do here
      else:
        self.octoprint_last_command = None
        self.octoprint_last_command_presses = 0
      
      
      # ------------------ Saving Vars -------------------
      # {"type":"save_vars",   "variables":["distance", "hotend", "bed"]}
      if current_action_type == "save_vars":
        variables = current_action.get("variables", [])
        # "variables":["distance", "hotend", "bed"]}
        for variable in variables:
          if variable in self.listening_variables: # Check that it's in there, not just as None
            saving_var = self.listening_variables[variable]
            if saving_var is not None:
              self._logger.debug(f"Saving value '{saving_var}' to variable '{variable}'.")
              settings_variables = self._profiles.get(self._active_profile_name, {}).get("variables", {})
              settings_variables[variable] = saving_var
              # self._settings.save() #TODO figure out if I really want to save them here
            else:
              self._logger.debug(f"Found nothing to save to variable '{variable}'.")
            del self.listening_variables[variable]
        continue # Go around again, nothing else to do here
        
        
      # ------------------ Listening Vars -------------------
      # handle if listening variables
      if self.listening_variables:
        self._logger.debug(f"Listening for variables {self.listening_variables.keys()}.")
        key_values = key_actions.get("variables", None)
        
        if key_values:
          for variable in self.listening_variables:
            variable_value = key_values.get(variable)
            if variable_value is not None:
              self._logger.debug(f"Found variable value for key '{key}'. Setting variable '{variable}' as value '{variable_value}'.")
              self.listening_variables[variable] = variable_value
        continue # Go around again, nothing else to do here
        
        
      # ------------------ Start Listening Vars -------------------
      # {"type":"listen_vars", "variables":["distance", "hotend", "bed"]}
      if current_action_type == "listen_vars":
        # "variables":["distance", "hotend", "bed"]
        variables = current_action.get("variables", [])
        for variable in variables:
          self._logger.debug(f"Started listening for variable '{variable}'.")
          self.listening_variables[variable] = None
        continue # Go around again, nothing else to do here
        
      
      # ------------------ Set Active Profile -------------------
      # {"type":"set_active_profile", "profile":"Profile Name"}
      if current_action_type == "set_active_profile":
        # "variables":["distance", "hotend", "bed"]
        profile = current_action.get("profile")
        
        if profile and profile in self._profile_names:
          self._active_profile_name = profile
          self._settings
        continue # Go around again, nothing else to do here
      
      
      # ------------------ Printer -------------------
      # {"type":"printer", "gcode":["G0 X10 Y10 F6000"], "send_while_printing":False}
      if current_action_type == "printer":
        # "gcode":["G0 X10 Y10 F6000"]
        gcode_commands = current_action.get("gcode", [])
        gcode_options = current_action.get("options", "")
        printer_status = self._printer.get_state_id()
        can_send_commands = True
        
        if printer_status == "PRINTING":
          can_send_commands = "p" in gcode_options
        elif printer_status == "PAUSED":
          can_send_commands = "u" in gcode_options
          
        
        if can_send_commands and gcode_commands:
          filtered_gcode_commands = [code for code in gcode_commands if code.get("code", None)]
          subbed_gcode_commands = [self.variable_sub(gcode.get("code", "")) for gcode in filtered_gcode_commands]
          
          self._logger.debug(f"Found printer commands for key '{key}'. Sending '{subbed_gcode_commands}'")
          self._printer.commands(commands=subbed_gcode_commands, force=("f" in gcode_options))
          
        else:
          self._logger.debug(f"Found printer commands for key '{key}'. Cannot send while '{printer_status}'")
        continue # Go around again, nothing else to do here
      
        
      # ------------------ PSU Control -------------------
      # {"type":"plugin_psucontrol", "command":"toggle", "hotend_max": 50}
      if current_action_type == "plugin_psucontrol":
        # "command":"toggle, "can_trigger_while_hot":False, "hotend_max":        
        PSU_STATES = {"on":1, "off":-1, "toggle":0}
        psu_command = current_action.get("command")
        
        if psu_command and psu_command in PSU_STATES:
          psucontrol_info = self._plugin_manager.get_plugin_info("psucontrol", require_enabled=True)
          if psucontrol_info:            
            psucontrol = self._plugin_manager.get_plugin("psucontrol")
            psucontrol_info_impl = psucontrol_info.get_implementation()

            psu_is_on = psucontrol_info_impl.isPSUOn
        
            desired_state = PSU_STATES[psu_command]
        
            if not psu_is_on and desired_state > -1:
              self._logger.debug(f"Found psu command for key '{key}'. Sending '{psu_command}'")
              psucontrol.PSUControl.turn_psu_on(psucontrol_info_impl)
            elif psu_is_on and desired_state < 1:
              tools_too_hot_to_turn_off_psu = False
              hotend_max = current_action.get("hotend_max", 50)

              printer_temps = self._printer.get_current_temperatures()
              
              for tool, tool_temps in printer_temps.items():
                if tool.startswith("tool") and tool_temps.get("actual", 0) > hotend_max:
                  tools_too_hot_to_turn_off_psu = True
                  break
              if not tools_too_hot_to_turn_off_psu:
                self._logger.debug(f"Found psu command for key '{key}'. Sending '{psu_command}'")
                psucontrol.PSUControl.turn_psu_off(psucontrol_info_impl)
              else:
                self._logger.debug(f"Found psu command for key '{key}'. User-defined max hotend temp '{hotend_max}' exceeded!")
            else:
              self._logger.error(f"Should Never Get Here")
          else:
            self._logger.error(f"PSU Control plugin is Disabled or Not Installed!")

        
            #
      # plugin_api_commands = current_action.get("plugin_api", [])
      # for plugin_api_command in plugin_api_commands:
      #   plugin_id = plugin_api_command.get("plugin")
      #   if plugin_id:
      #     plugin_info = self._plugin_manager.get_plugin_info(plugin_id, require_enabled=True)
      #   if not plugin_info:
      #     self._logger.error(f"Plugin {plugin_id} is Disabled or Not Installed!")
      #
      #   method = plugin_api_command.get("method", "")
      #   method = method.uppercase
      #
      #
      #   if method == "POST":
      #     response = requests.get(f"http://127.0.0.1:{self._settings.global_get(['server', 'port'])}/api/plugin/{plugin_id}",
      #                             headers={"X-Api-Key": self._settings.global_get(["api", "key"])})
      #   elif method == "GET":
      #     response = requests.post(f"http://127.0.0.1:{self._settings.global_get(['server', 'port'])}/api/plugin/{plugin_id}",
      #                              json={"command":psu_command, "data":},
      #                              headers={"X-Api-Key": self._settings.global_get(["api", "key"])})
        
        # psucontrol.PSUControl.turn_psu_on(psucontrol_info.get_implementation())

        # response = requests.get("http://127.0.0.1:{}/api/plugin/psucontrol".format(self._settings.global_get(["server", "port"])),
#                                  headers={"X-Api-Key": self._settings.global_get(["api", "key"])})
#         self._logger.info(f"*---- Got response from PSU '{response}' '{response.text}'. ----*")
#
#         response = requests.post("http://127.0.0.1:{}/api/plugin/psucontrol".format(self._settings.global_get(["server", "port"])),
#                                  json={"command":psu_command},
#                                  headers={"X-Api-Key": self._settings.global_get(["api", "key"])})
#         self._logger.info(f"*---- Got response from PSU '{response}' '{response.text}'. ----*")
        
        
        
      
      
      #logger_command = current_action.get("logger", False)
#       if logger_command:
#         self._logger.info(f"*---- Found logger command for key '{key}'. ----*")
#         self._logger.info(f"Current Key Detection Binding '{self._settings.get(['key_discovery'])}'")
#         self._logger.info(f"Current Setting for variables: {self._settings.get(['profiles', active_profile, 'variables'])}")
#         self._logger.info(f"Current Setting for commands: {commands}")
#         self._logger.info(f"Logging value of keyboard.")
#         i = 0
#         for row in self._settings.get(['profiles', active_profile, 'keyboard', 'rows']):
#           self._logger.info(f"Current Setting for {i}: {row['keys']}")
#           i = i + 1


  ##~~ StartupPlugin mixin
  
  
  def load_variables(self, variable_array):
    converted_variables = {}
    for variable in variable_array:
      if variable and "key" in variable and "value" in variable and variable["value"] is not None:
        converted_variables[variable["key"]] = variable["value"]
    return converted_variables

  def load_commands(self, command_array):
    converted_commands = {}
    for command in command_array:
      if command and "key" in command and "value" in command and command["value"] is not None:
        converted_commands[command["key"]] = command["value"]
        converted_commands[command["key"]]["variables"] = self.load_variables(command["value"]["variables"])
    return converted_commands
  
  def load_profiles(self):
    profiles = {}
    for profile in self._settings.get(["profiles"]):
      profiles[profile["key"]] = profile["value"]
    
    for profile_data in profiles.values():
      profile_data["variables"] = self.load_variables(profile_data.get("variables", []))
      profile_data["commands"] = self.load_commands(profile_data.get("commands", []))
      profile_data.pop("keyboard")
    return profiles
  
  def load_settings(self):
    self._device_path = self._settings.get(["device_path"])
    self._active_profile_name = self._settings.get(["active_profile"])
    
    self._profiles = self.load_profiles()
    
    self._profile_names = []
    for profile_name in self._profiles.keys():
      self._profile_names.append(profile_name)
    
  def on_after_startup(self):
    self._logger.info("USB Keyboard loading")
    
    self._active_listening = False
    self.load_settings()
    self.key_status = {}
    self.key_discovery = {}
    self.last_key_pressed = None
    self.listening_variables = {}
    self._settings.set(["key_discovery"], {})
    self.should_stop_polling=False
    self.octoprint_last_command = None
    self.octoprint_last_command_presses = 0
    
    eventManager().subscribe("plugin_usb_keyboard_key_event", self._key_event)
    
    self.listener = KeyboardListenerThread('USB Keyboard Listener Thread', self._device_path)
    self.listener.start()
    
    self._logger.info("Started Keyboard Listener")
    
    
    
    # self.listener = threading.Thread(target=key_read_loop, daemon=True) # Make thread a daemon thread
    # self.listener.start()
    # self.listener = threading.Thread(target=keyboard_listener, daemon=True) # Make thread a daemon thread
    # self.listener.start()
    # self.listener = keyboard.Listener(on_press=on_press,on_release=on_release,suppress=False)
    # self.listener.start()
    
  def on_shutdown(self):
    self.listener.stop()
    # self.listener.join(0.1)
    self._logger.info("Stopped Keyboard Listener")
    

  ##~~ SettingsPlugin mixin
  
  def on_settings_save(self, data):
    try:
      octoprint.plugin.SettingsPlugin.on_settings_save(self, data)
      self.load_settings()
    except TypeError as err:
      self._logger.error("Saving settings broke!", err)
      
      
  def get_settings_version(self):
    # will be in settings as _config_version
    return 1
    
    
  def on_settings_migrate(self, target, current=None):
    self._logger.debug("Migrating settings target {target}, current {current}")
    
    ##########################################################
    # From https://gist.github.com/nvie/f304caf3b4f1ca4c3884 #
    ##########################################################
    def traverse(obj, path=None, callback=None):
      """
      Traverse an arbitrary Python object structure (limited to JSON data
      types), calling a callback function for every element in the structure,
      and inserting the return value of the callback as the new value.
      """
      if path is None:
        path = []

      if isinstance(obj, dict):
        value = {k: traverse(v, path + [k], callback) for k, v in obj.items()}
      elif isinstance(obj, list):
        value = [traverse(elem, path + [[]], callback) for elem in obj]
      else:
        value = obj

      if callback is None:
        return value
      else:
        return callback(path, value)


    def traverse_modify(obj, target_path, action):
      """
      Traverses an arbitrary object structure and where the path matches,
      performs the given action on the value, replacing the node with the
      action's return value.
      """
      def transformer(path, value):
        if path == target_path:
          return action(value)
        else:
          return value

      return traverse(obj, callback=transformer)
    ##########################################################
        
    def migrate_gcode_to_v1(value):
      new_gcode = {}
      if value.get("type") == "printer":        
        new_gcode["type"] = "printer"
        new_gcode["gcode"] = []
        old_gcode = value.get("gcode", [])
        for id in range(len(old_gcode)):
          new_gcode["gcode"].append({"id":id, "code":old_gcode[id]})
        new_gcode["options"] = ""
        if value.get("send_while_printing", False):
          new_gcode["options"] = "pu"
        return new_gcode
      return value
      
    if current is None or current < 1:
      settings = self._settings.get([])
      
      settings = traverse_modify(settings, ["profiles", [], "value", "commands", [], "value", "pressed", []], migrate_gcode_to_v1)
      settings = traverse_modify(settings, ["profiles", [], "value", "commands", [], "value", "released", []], migrate_gcode_to_v1)
            
      self._settings.set([], settings)

  def get_settings_defaults(self):
    # Remember to keep _config_version up to date
    # put your plugin's default settings here
    
    # Version 0 settings
    return dict(
      active_profile="Example QWERTY 60%",
      device_path="/dev/input/event1",
      profiles=[
        {"key":"Example QWERTY 60%","value":{
          "description":"An example profile showing how an entire 60% keyboard can be represented.",
          "commands":[],
          "keyboard": {
            "scale": 2,
            "board": [
              {"keys":[
                {"key":"`", "alias":None, "w":1, "h":1}, 
                {"key":"1", "alias":None, "w":1, "h":1},
                {"key":"2", "alias":None, "w":1, "h":1},
                {"key":"3", "alias":None, "w":1, "h":1},
                {"key":"4", "alias":None, "w":1, "h":1},
                {"key":"5", "alias":None, "w":1, "h":1},
                {"key":"6", "alias":None, "w":1, "h":1},
                {"key":"7", "alias":None, "w":1, "h":1},
                {"key":"8", "alias":None, "w":1, "h":1},
                {"key":"9", "alias":None, "w":1, "h":1},
                {"key":"0", "alias":None, "w":1, "h":1},
                {"key":"-", "alias":None, "w":1, "h":1},
                {"key":"=", "alias":None, "w":1, "h":1},
                {"key":"backspace", "alias":None, "w":2.25, "h":1},
              ]
            },{
              "keys":[
                {"key":"tab", "alias":None, "w":1.5, "h":1}, 
                {"key":"q", "alias":None, "w":1, "h":1},
                {"key":"w", "alias":None, "w":1, "h":1},
                {"key":"e", "alias":None, "w":1, "h":1},
                {"key":"r", "alias":None, "w":1, "h":1},
                {"key":"t", "alias":None, "w":1, "h":1},
                {"key":"y", "alias":None, "w":1, "h":1},
                {"key":"u", "alias":None, "w":1, "h":1},
                {"key":"i", "alias":None, "w":1, "h":1},
                {"key":"o", "alias":None, "w":1, "h":1},
                {"key":"p", "alias":None, "w":1, "h":1},
                {"key":"[", "alias":None, "w":1, "h":1},
                {"key":"]", "alias":None, "w":1, "h":1},
                {"key":"\\", "alias":None, "w":1.75, "h":1},
              ]
            },{
              "keys":[
                {"key":"caps_lock", "alias":None, "w":2, "h":1}, 
                {"key":"a", "alias":None, "w":1, "h":1},
                {"key":"s", "alias":None, "w":1, "h":1},
                {"key":"d", "alias":None, "w":1, "h":1},
                {"key":"f", "alias":None, "w":1, "h":1},
                {"key":"g", "alias":None, "w":1, "h":1},
                {"key":"h", "alias":None, "w":1, "h":1},
                {"key":"j", "alias":None, "w":1, "h":1},
                {"key":"k", "alias":None, "w":1, "h":1},
                {"key":"l", "alias":None, "w":1, "h":1},
                {"key":";", "alias":None, "w":1, "h":1},
                {"key":"'", "alias":None, "w":1, "h":1},
                {"key":"enter", "alias":None, "w":2.25, "h":1}
              ]
            },{
              "keys":[
                {"key":"shift", "alias":None, "w":2.5, "h":1}, 
                {"key":"z", "alias":None, "w":1, "h":1},
                {"key":"x", "alias":None, "w":1, "h":1},
                {"key":"c", "alias":None, "w":1, "h":1},
                {"key":"v", "alias":None, "w":1, "h":1},
                {"key":"b", "alias":None, "w":1, "h":1},
                {"key":"n", "alias":None, "w":1, "h":1},
                {"key":"m", "alias":None, "w":1, "h":1},
                {"key":",", "alias":None, "w":1, "h":1},
                {"key":".", "alias":None, "w":1, "h":1},
                {"key":"/", "alias":None, "w":1, "h":1},
                {"key":"shift_r", "alias":None, "w":2.75, "h":1},
              ]
            },{
              "keys":[
                {"key":"ctrl", "alias":None, "w":1.5, "h":1}, 
                {"key":"alt", "alias":None, "w":1.5, "h":1},
                {"key":"cmd", "alias":None, "w":1.5, "h":1},
                {"key":"space", "alias":None, "w":6.5, "h":1},
                {"key":"cmd_r", "alias":None, "w":1.5, "h":1},
                {"key":"alt_r", "alias":None, "w":1.25, "h":1},
                {"key":"ctrl_r", "alias":None, "w":1.5, "h":1},
              ]
            }]
          },
          "variables":[]
        }},
        {"key":"Example 10key - evdev", "value":{
          "description":"An example profile showing how a simple 10key can be represented, how variables work, and how to use each of the command types. This profile works on a Linux machine (like a raspberry pi) connected to a printer with a 300x300 bed that accepts Marlin-flavored gcode.",
          "commands":[
            # **************************** Linux ******************************
            {"key":"kpdot", "alias":".", "value":     {"pressed": [{"type":"listen_vars", "variables":["distance", "hotend", "bed"]}],  "released": [{"type":"octoprint","command":"confirm_last_command","presses_required":1},{"type":"save_vars", "variables":["distance", "hotend", "bed"]}], "variables":[]}},  # making this my variable modifier
            {"key":"kpenter", "alias":"enter", "value":   {"pressed": [{"type":"printer", "gcode":["G28 Z"], "send_while_printing": False}],"released": [], "variables":  []                                }},# homing z
            {"key":"kp0", "alias":"0", "value":       {"pressed": [{"type":"printer", "gcode":["G28 X Y"], "send_while_printing": False}],                            "released": [], "variables":  [{"key":"distance", "value":0.1}] }},  # homing x, y
            {"key":"kp1", "alias":"1", "value":       {"pressed": [{"type":"printer", "gcode":["G0 X10 Y10 F6000"], "send_while_printing": False}],                   "released": [], "variables":  [{"key":"distance", "value":1}  ] }},  # front left corner, 10x10 in
            {"key":"kp2", "alias":"2", "value":       {"pressed": [{"type":"printer", "gcode":["G91","G0 Y-<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"distance", "value":10} ] }},  # move south
            {"key":"kp3", "alias":"3", "value":       {"pressed": [{"type":"printer", "gcode":["G0 X290 Y10 F6000"], "send_while_printing": False}],                  "released": [], "variables":  [{"key":"distance", "value":100}] }},  # front right corner, 10x10 in
            {"key":"kp4", "alias":"4", "value":       {"pressed": [{"type":"printer", "gcode":["G91","G0 X-<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"bed",      "value":0}  ] }},  # move west
            {"key":"kp5", "alias":"5", "value":       {"pressed": [{"type":"printer", "gcode":["G0 X150 Y150 F6000"], "send_while_printing": False}],                 "released": [], "variables":  [{"key":"bed",      "value":50} ] }},  # center
            {"key":"kp6", "alias":"6", "value":       {"pressed": [{"type":"printer", "gcode":["G91","G0 X+<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"bed",      "value":60} ] }},  # move east
            {"key":"kp7", "alias":"7", "value":       {"pressed": [{"type":"printer", "gcode":["G0 X10 Y290 F6000"], "send_while_printing": False}],                  "released": [], "variables":  [{"key":"hotend",   "value":0}  ] }},  # rear left corner, 10x10 in
            {"key":"kp8", "alias":"8", "value":       {"pressed": [{"type":"printer", "gcode":["G91","G0 Y+<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"hotend",   "value":205}] }},  # move north
            {"key":"kp9", "alias":"9", "value":       {"pressed": [{"type":"printer", "gcode":["G0 X290 Y290 F6000"], "send_while_printing": False}],                 "released": [], "variables":  [{"key":"hotend",   "value":210}] }},  # rear right corner, 10x10 in
            {"key":"kpplus", "alias":"+", "value":    {"pressed": [{"type":"printer", "gcode":["G91","G0 Z-<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move down
            {"key":"kpminus", "alias":"-", "value":   {"pressed": [{"type":"printer", "gcode":["G91","G0 Z+<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move up
            {"key":"kpasterisk", "alias":"*", "value":{"pressed": [{"type":"printer", "gcode":["G91","G1 E-<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move up
            {"key":"backspace", "alias":None, "value": {"pressed": [{"type":"printer", "gcode":["G91","G1 E+<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move up
            {"key":"kpslash", "alias":"/", "value":   {"pressed": [{"type":"printer", "gcode":["M104 S<hotend>","M140 S<bed>"], "send_while_printing": False}],       "released": [], "variables":  []                                }},  # set hotend and bed
            {"key":"tab", "alias":None, "value":       {"pressed": [{"type":"octoprint", "command":"start_print", "presses_required":5 }],               "released": [], "variables":  []                                }},  # start selected print
            {"key":"equal", "alias":"=", "value":       {"pressed": [{"type":"octoprint", "command":"cancel_print", "presses_required":5 }],               "released": [], "variables":  []                                }},  # stop running print
            {"key":"esc", "alias":None, "value":       {"pressed": [{"type":"plugin_psucontrol", "command":"toggle", "hotend_max":50 }],               "released": [], "variables":  []                                }},  # turn off PSU if hotends < 50c
          ],
          "keyboard": {
            "scale": 3,
            "board": [
              {"keys":[{"key":"esc", "alias":None, "w":1, "h":1}, {"key":None, "alias":None, "w":1, "h":1}, {"key":"tab", "alias":None, "w":1, "h":1}, {"key":"equal", "alias":"=", "w":1, "h":1}]},
              {"keys":[{"key":None, "alias":None, "w":1, "h":1}, {"key":"kpslash", "alias":"/", "w":1, "h":1}, {"key":"kpasterisk", "alias":"*", "w":1, "h":1}, {"key":"backspace", "alias":None, "w":1, "h":1}]},
              {"keys":[{"key":"kp7", "alias":"7", "w":1, "h":1}, {"key":"kp8", "alias":"8", "w":1, "h":1}, {"key":"kp9", "alias":"9", "w":1, "h":1}, {"key":"kpminus", "alias":"-", "w":1, "h":1}]},
              {"keys":[{"key":"kp4", "alias":"4", "w":1, "h":1}, {"key":"kp5", "alias":"5", "w":1, "h":1}, {"key":"kp6", "alias":"6", "w":1, "h":1}, {"key":"kpplus", "alias":"+", "w":1, "h":1}]},
              {"keys":[{"key":"kp1", "alias":"1", "w":1, "h":1}, {"key":"kp2", "alias":"2", "w":1, "h":1}, {"key":"kp3", "alias":"3", "w":1, "h":1}, {"key":"kpenter", "alias":"enter", "w":1, "h":2}]},
              {"keys":[{"key":"kp0", "alias":"0", "w":2, "h":1}, {"key":"kpdot", "alias":".", "w":1, "h":1}]}
            ]
          },
          "variables":[
            {"key":"distance", "value":   1 },
            {"key":"bed",      "value":  60 },
            {"key":"hotend",   "value": 210 }
          ]
        }},
        {"key":"Example 10key - pynput", "value":{
          "description":"An example profile showing how a simple 10key can be represented, how variables work, and how to use each of the command types. This profile works on Mac or Windows machines connected to a printer with a 300x300 bed that accepts Marlin-flavored gcode.",
          "commands":[
            # **************************** Mac ******************************
            {"key":".", "alias":None, "value":         {"pressed": [{"type":"listen_vars", "variables":["distance", "hotend", "bed"], "send_while_printing": False}],  "released": [{"type":"octoprint","command":"confirm_last_command","presses_required":1},{"type":"save_vars", "variables":["distance", "hotend", "bed"]}], "variables":[]}},  # making this my variable modifier
            {"key":"\\x03", "alias":"enter", "value":     {"pressed": [{"type":"printer", "gcode":["G28 Z"], "send_while_printing": False}],                              "released": [], "variables":  []                                }},# homing z
            {"key":"0", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G28 X Y"], "send_while_printing": False}],                            "released": [], "variables":  [{"key":"distance", "value":0.1}] }},  # homing x, y
            {"key":"1", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G0 X10 Y10 F6000"], "send_while_printing": False}],                   "released": [], "variables":  [{"key":"distance", "value":1}  ] }},  # front left corner, 10x10 in
            {"key":"2", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Y-<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"distance", "value":10} ] }},  # move south
            {"key":"3", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G0 X290 Y10 F6000"], "send_while_printing": False}],                  "released": [], "variables":  [{"key":"distance", "value":100}] }},  # front right corner, 10x10 in
            {"key":"4", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 X-<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"bed",      "value":0}  ] }},  # move west
            {"key":"5", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G0 X150 Y150 F6000"], "send_while_printing": False}],                 "released": [], "variables":  [{"key":"bed",      "value":50} ] }},  # center
            {"key":"6", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 X+<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"bed",      "value":60} ] }},  # move east
            {"key":"7", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G0 X10 Y290 F6000"], "send_while_printing": False}],                  "released": [], "variables":  [{"key":"hotend",   "value":0}  ] }},  # rear left corner, 10x10 in
            {"key":"8", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Y+<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"hotend",   "value":205}] }},  # move north
            {"key":"9", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G0 X290 Y290 F6000"], "send_while_printing": False}],                 "released": [], "variables":  [{"key":"hotend",   "value":210}] }},  # rear right corner, 10x10 in
            {"key":"+", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Z-<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move down
            {"key":"-", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Z+<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move up
            {"key":"*", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["G91","G1 E-<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move up
            {"key":"backspace", "alias":None, "value": {"pressed": [{"type":"printer", "gcode":["G91","G1 E+<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move up
            {"key":"/", "alias":None, "value":         {"pressed": [{"type":"printer", "gcode":["M104 S<hotend>","M140 S<bed>"], "send_while_printing": False}],       "released": [], "variables":  []                                }},  # set hotend and bed
            {"key":"tab", "alias":None, "value":       {"pressed": [{"type":"octoprint", "command":"start_print", "presses_required":5 }],               "released": [], "variables":  []                                }},  # start selected print
            {"key":"=", "alias":None, "value":       {"pressed": [{"type":"octoprint", "command":"cancel_print", "presses_required":5 }],               "released": [], "variables":  []                                }},  # stop running print
            {"key":"esc", "alias":None, "value":       {"pressed": [{"type":"plugin_psucontrol", "command":"toggle", "hotend_max":50 }],               "released": [], "variables":  []                                }}   # turn off PSU if hotends < 50c
          ],
          "keyboard": {
            "scale": 3,
            "board": [
              {"keys":[{"key":"esc", "alias":None, "w":1, "h":1}, {"key":None, "alias":None, "w":1, "h":1}, {"key":"tab", "alias":None, "w":1, "h":1}, {"key":"=", "alias":None, "w":1, "h":1}]},
              {"keys":[{"key":None, "alias":None, "w":1, "h":1}, {"key":"/", "alias":None, "w":1, "h":1}, {"key":"*", "alias":None, "w":1, "h":1}, {"key":"backspace", "alias":None, "w":1, "h":1}]},
              {"keys":[{"key":"7", "alias":None, "w":1, "h":1}, {"key":"8", "alias":None, "w":1, "h":1}, {"key":"9", "alias":None, "w":1, "h":1}, {"key":"-", "alias":None, "w":1, "h":1}]},
              {"keys":[{"key":"4", "alias":None, "w":1, "h":1}, {"key":"5", "alias":None, "w":1, "h":1}, {"key":"6", "alias":None, "w":1, "h":1}, {"key":"+", "alias":None, "w":1, "h":1}]},
              {"keys":[{"key":"1", "alias":None, "w":1, "h":1}, {"key":"2", "alias":None, "w":1, "h":1}, {"key":"3", "alias":None, "w":1, "h":1}, {"key":"\\x03", "alias":"enter", "w":1, "h":2}]},
              {"keys":[{"key":"0", "alias":None, "w":2, "h":1}, {"key":".", "alias":None, "w":1, "h":1}]}
            ]
          },
          "variables":[
            {"key":"distance", "value":   1 },
            {"key":"bed",      "value":  60 },
            {"key":"hotend",   "value": 210 }
          ]
        }},
        {"key":"Example 10key - pynput with unicode symbols", "value":{
          "description":"Same as 'Example 10key - pynput', but with symbolic, unicode aliases. It makes for a more explanitory keyboard map. If you see nothing but blocks, I'm sorry!",
          "commands":[
            # **************************** Mac ******************************
            {"key":".", "alias":"❖", "value":         {"pressed": [{"type":"listen_vars", "variables":["distance", "hotend", "bed"], "send_while_printing": False}],  "released": [{"type":"octoprint","command":"confirm_last_command","presses_required":1},{"type":"save_vars", "variables":["distance", "hotend", "bed"]}], "variables":[]}},  # making this my variable modifier
            {"key":"\\x03", "alias":"⟰ Z", "value":     {"pressed": [{"type":"printer", "gcode":["G28 Z"], "send_while_printing": False}],                              "released": [], "variables":  []                                }},# homing z
            {"key":"0", "alias":"⟰ XY", "value":         {"pressed": [{"type":"printer", "gcode":["G28 X Y"], "send_while_printing": False}],                            "released": [], "variables":  [{"key":"distance", "value":0.1}] }},  # homing x, y
            {"key":"1", "alias":"⬋", "value":         {"pressed": [{"type":"printer", "gcode":["G0 X10 Y10 F6000"], "send_while_printing": False}],                   "released": [], "variables":  [{"key":"distance", "value":1}  ] }},  # front left corner, 10x10 in
            {"key":"2", "alias":"▼", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Y-<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"distance", "value":10} ] }},  # move south
            {"key":"3", "alias":"⬊", "value":         {"pressed": [{"type":"printer", "gcode":["G0 X290 Y10 F6000"], "send_while_printing": False}],                  "released": [], "variables":  [{"key":"distance", "value":100}] }},  # front right corner, 10x10 in
            {"key":"4", "alias":"◀︎", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 X-<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"bed",      "value":0}  ] }},  # move west
            {"key":"5", "alias":"●", "value":         {"pressed": [{"type":"printer", "gcode":["G0 X150 Y150 F6000"], "send_while_printing": False}],                 "released": [], "variables":  [{"key":"bed",      "value":50} ] }},  # center
            {"key":"6", "alias":"▶︎", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 X+<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"bed",      "value":60} ] }},  # move east
            {"key":"7", "alias":"⬉", "value":         {"pressed": [{"type":"printer", "gcode":["G0 X10 Y290 F6000"], "send_while_printing": False}],                  "released": [], "variables":  [{"key":"hotend",   "value":0}  ] }},  # rear left corner, 10x10 in
            {"key":"8", "alias":"▲", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Y+<distance> F6000","G90"], "send_while_printing": False}],  "released": [], "variables":  [{"key":"hotend",   "value":205}] }},  # move north
            {"key":"9", "alias":"⬈", "value":         {"pressed": [{"type":"printer", "gcode":["G0 X290 Y290 F6000"], "send_while_printing": False}],                 "released": [], "variables":  [{"key":"hotend",   "value":210}] }},  # rear right corner, 10x10 in
            {"key":"+", "alias":"⬇︎", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Z-<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move down
            {"key":"-", "alias":"⬆︎", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Z+<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move up
            {"key":"*", "alias":"E-", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G1 E-<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move up
            {"key":"backspace", "alias":"E+", "value": {"pressed": [{"type":"printer", "gcode":["G91","G1 E+<distance> F300","G90"], "send_while_printing": False}],   "released": [], "variables":  []                                }},  # move up
            {"key":"/", "alias":"°C", "value":         {"pressed": [{"type":"printer", "gcode":["M104 S<hotend>","M140 S<bed>"], "send_while_printing": False}],       "released": [], "variables":  []                                }},  # set hotend and bed
            {"key":"tab", "alias":">", "value":       {"pressed": [{"type":"octoprint", "command":"start_print", "presses_required":5 }],               "released": [], "variables":  []                                }},  # start selected print
            {"key":"=", "alias":"⬣", "value":       {"pressed": [{"type":"octoprint", "command":"cancel_print", "presses_required":5 }],               "released": [], "variables":  []                                }},  # stop running print
            {"key":"esc", "alias":"PSU", "value":       {"pressed": [{"type":"plugin_psucontrol", "command":"toggle", "hotend_max":50 }],               "released": [], "variables":  []                                }}   # turn off PSU if hotends < 50c
          ],
          "keyboard": {
            "scale": 3,
            "board": [
              {"keys":[{"key":"esc", "alias":"PSU", "w":1, "h":1}, {"key":None, "alias":None, "w":1, "h":1}, {"key":"tab", "alias":">", "w":1, "h":1}, {"key":"=", "alias":"⬣", "w":1, "h":1}]},
              {"keys":[{"key":None, "alias":None, "w":1, "h":1}, {"key":"/", "alias":"°C", "w":1, "h":1}, {"key":"*", "alias":"E-", "w":1, "h":1}, {"key":"backspace", "alias":"E+", "w":1, "h":1}]},
              {"keys":[{"key":"7", "alias":"⬉", "w":1, "h":1}, {"key":"8", "alias":"▲", "w":1, "h":1}, {"key":"9", "alias":"⬈", "w":1, "h":1}, {"key":"-", "alias":"⬆︎", "w":1, "h":1}]},
              {"keys":[{"key":"4", "alias":"◀︎", "w":1, "h":1}, {"key":"5", "alias":"●", "w":1, "h":1}, {"key":"6", "alias":"▶︎", "w":1, "h":1}, {"key":"+", "alias":"⬇︎", "w":1, "h":1}]},
              {"keys":[{"key":"1", "alias":"⬋", "w":1, "h":1}, {"key":"2", "alias":"▼", "w":1, "h":1}, {"key":"3", "alias":"⬊", "w":1, "h":1}, {"key":"\\x03", "alias":"⟰ Z", "w":1, "h":2}]},
              {"keys":[{"key":"0", "alias":"⟰ XY", "w":2, "h":1}, {"key":".", "alias":"❖", "w":1, "h":1}]}
            ]
          },
          "variables":[
            {"key":"distance", "value":   1 },
            {"key":"bed",      "value":  60 },
            {"key":"hotend",   "value": 210 }
          ]
        }}
      ]
    )
    
  ##~~ SimpleApi mixin
  
  def get_api_commands(self):
    return dict(
      key_discovery=[],# ["row", "column", "profile"],
      query_devices=[],
      change_device_path=["device_path"],
      active_listening=["action"]
    )

  def on_api_command(self, command, data):
    data["reply"] = command
    
    # self._logger.info(f"Received command from frontend '{command}' with '{data}'.")
    
    
    if command == "key_discovery":
      # self._logger.info(f"key_discovery called, row is {data['row']}, key is {data['column']}")
      self._logger.debug("key_discovery called")
      
      self.key_discovery = data
    elif command == "query_devices":
      self._logger.debug(f"configure_listener called, asking listener for more data")
      data["message"], data["options"] = self.listener.get_device_info()
      self._plugin_manager.send_plugin_message(self._identifier, data)
    elif command == "change_device_path":
      device_path = data["device_path"]
      if device_path != self.listener.device_path:
        self.listener.stop()
        self.listener = KeyboardListenerThread('USB Keyboard Listener Thread', device_path)
        self.listener.start()
    elif command == "active_listening":
      action = data["action"]
      self._active_listening = (action == "start")
      if self._active_listening:
        self._active_listening_start = time.time()
        
      

  def on_api_get(self, request):
      return 'f{"last_key_pressed"="{self.last_key_pressed}"}'

  ##~~ AssetPlugin mixin

  def get_assets(self):
    # Define your plugin's asset files to automatically include in the
    # core UI here.
    return dict(
      js=["js/usb_keyboard.js", "js/knockout-repeat.js", "js/knockout-file-bind.js"],
      # clientjs=['js/requre.js'],
      # jsclient=['js/requre.js'],
      css=["css/usb_keyboard.css"],
      # less=["less/usb_keyboard.less"]
    )

  ##~~ TemplatePlugin mixin
  
  def get_template_configs(self):
    return [
      # dict(type="navbar", custom_bindings=False),
      # dict(type="settings", custom_bindings=False)
    ]

  ##~~ Softwareupdate hook

  def get_update_information(self):
    # Define the configuration for your plugin to use with the Software Update
    # Plugin here. See https://docs.octoprint.org/en/master/bundledplugins/softwareupdate.html
    # for details.
    return dict(
      usb_keyboard=dict(
        displayName="Usb_keyboard Plugin",
        displayVersion=self._plugin_version,

        # version check: github repository
        type="github_release",
        user="barrettford",
        repo="OctoPrint-Usb_keyboard",
        current=self._plugin_version,

        # update method: pip
        pip="https://github.com/barrettford/OctoPrint-Usb_keyboard/archive/{target_version}.zip"
      )
    )
    
  


# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "USB Keyboard"

# Starting with OctoPrint 1.4.0 OctoPrint will also support to run under Python 3 in addition to the deprecated
# Python 2. New plugins should make sure to run under both versions for now. Uncomment one of the following
# compatibility flags according to what Python versions your plugin supports!
__plugin_pythoncompat__ = ">=3,<4" # only python 3

def register_custom_events(*args, **kwargs):
  return ["key_event"]

def __plugin_load__():
  plugin = Usb_keyboardPlugin()
  
  global __plugin_implementation__
  __plugin_implementation__ = plugin

  global __plugin_hooks__
  __plugin_hooks__ = {
    "octoprint.plugin.softwareupdate.check_config": plugin.get_update_information,
    "octoprint.events.register_custom_events": register_custom_events
  }

