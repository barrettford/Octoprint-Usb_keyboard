# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import octoprint.printer
import re
import json
import requests
import inspect
import sys
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
        setting_var = self._variables[clean_variable]
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
    
    # print(all_events())
    if key_state == "pressed":
      self.last_key_pressed = key
      if self.key_discovery:
        self.key_discovery["name"] = key
        self._logger.info(f"Frontend asked for key, detecting keypress '{key}'")
        self.send_key_discovery(self.key_discovery)
        self.key_discovery = {}
        return
    
    
    # self._logger.info(f"Key '{key}' {key_state}")
    
    commands = self._commands
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
        self._logger.info(f"Found action with no type! Guess we do nothing...")
        continue
      
      # ------------------ Saving Vars -------------------
      # {"type":"save_vars",   "variables":["distance", "hotend", "bed"]}
      if current_action_type == "save_vars":
        variables = current_action.get("variables", [])
        # "variables":["distance", "hotend", "bed"]}
        for variable in variables:
          if variable in self.listening_variables: # Check that it's in there, not just as None
            saving_var = self.listening_variables[variable]
            if saving_var is not None:
              self._logger.info(f"Saving value '{saving_var}' to variable '{variable}'.")
              self._variables[variable] = saving_var
              # self._settings.save() #TODO figure out if I really want to save them here
            else:
              self._logger.info(f"Found nothing to save to variable '{variable}'.")
            del self.listening_variables[variable]
        continue # Go around again, nothing else to do here
        
        
      # ------------------ Listening Vars -------------------
      # handle if listening variables
      if self.listening_variables:
        self._logger.info(f"Listening for variables {self.listening_variables.keys()}.")
        key_values = key_actions.get("variables", None)
        
        if key_values:
          for variable in self.listening_variables:
            variable_value = key_values.get(variable)
            if variable_value is not None:
              self._logger.info(f"Found variable value for key '{key}'. Setting variable '{variable}' as value '{variable_value}'.")
              self.listening_variables[variable] = variable_value
        continue # Go around again, nothing else to do here
        
        
      # ------------------ Start Listening Vars -------------------
      # {"type":"listen_vars", "variables":["distance", "hotend", "bed"]}
      if current_action_type == "listen_vars":
        # "variables":["distance", "hotend", "bed"]
        variables = current_action.get("variables", [])
        for variable in variables:
          self._logger.info(f"Started listening for variable '{variable}'.")
          self.listening_variables[variable] = None
        continue # Go around again, nothing else to do here
      
      
      # ------------------ Printer -------------------
      # {"type":"printer", "gcode":["G0 X10 Y10 F6000"]}
      if current_action_type == "printer":
        # "gcode":["G0 X10 Y10 F6000"]
        gcode_commands = current_action.get("gcode", [])
        if gcode_commands:
          subbed_gcode_commands = [self.variable_sub(gcode) for gcode in gcode_commands]
          self._logger.info(f"Found printer commands for key '{key}'. Sending '{subbed_gcode_commands}'")
          self._printer.commands(subbed_gcode_commands)
        continue # Go around again, nothing else to do here
        
        
      # ------------------ PSU Control -------------------
      # {"type":"psu", "command":"toggle"}
      if current_action_type == "psu":
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
              self._logger.info(f"Found psu command for key '{key}'. Sending '{psu_command}'")
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
                self._logger.info(f"Found psu command for key '{key}'. Sending '{psu_command}'")
                psucontrol.PSUControl.turn_psu_off(psucontrol_info_impl)
              else:
                self._logger.info(f"Found psu command for key '{key}'. User-defined max hotend temp '{hotend_max}' exceeded!")
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
    
    
    # print(f"*************** VARIABLE ARRAY **************\n {variable_array}\n\n\n")
    
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
  
  def load_commands_and_variables(self):
    self._active_profile_name = self._settings.get(["active_profile"])
    
    profiles = self._settings.get(["profiles"])
    
    # print(f"*************** PROFILES **************\n {profiles}\n\n\n")
    
    active_profile = {}
    for profile in profiles:
      if profile.get("key") == self._active_profile_name:
        active_profile = profile.get("value")
    
    # print(f"Active Profile {active_profile}")
    self._commands = self.load_commands(active_profile.get("commands", []))
    # print(f"Loaded Commands {self._commands}")
    
    self._variables = self.load_variables(active_profile.get("variables", []))
    # print(f"Loaded Variables {self._variables}")
  
  def on_after_startup(self):
    self._logger.info("USB Keyboard loading")
    
    self.load_commands_and_variables()
    self.key_status = {}
    self.key_discovery = {}
    self.last_key_pressed = None
    self.listening_variables = {}
    self._settings.set(["key_discovery"], {})
    self.should_stop_polling=False
    
    eventManager().subscribe("plugin_usb_keyboard_key_event", self._key_event)
    
    self.listener = KeyboardListenerThread('USB Keyboard Listener Thread')
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
      octoprint.plugin.SettingsPlugin.on_settings_save(self, data)
      
      self.load_commands_and_variables()

  def get_settings_defaults(self):
    # put your plugin's default settings here
    return dict(
      active_profile="default",
      
      profiles=[
        {"key":"test","value":{
          "commands":[],
          "keyboard":[
            {"keys":[None]}
          ],
          "variables":[]
        }},
        {"key":"default", "value":{
          "commands":[
            # **************************** Linux ******************************
            {"key":"KPDOT", "value":     {"pressed": [{"type":"listen_vars", "variables":["distance", "hotend", "bed"]}],  "released": [{"type":"save_vars", "variables":["distance", "hotend", "bed"]}], "variables":[]}},  # making this my variable modifier
            {"key":"KPENTER", "value":   {"pressed": [{"type":"printer", "gcode":["G28 Z"]}],                              "released": [], "variables":  []                                }},# homing z
            {"key":"KP0", "value":       {"pressed": [{"type":"printer", "gcode":["G28 X Y"]}],                            "released": [], "variables":  [{"key":"distance", "value":0.1}] }},  # homing x, y
            {"key":"KP1", "value":       {"pressed": [{"type":"printer", "gcode":["G0 X10 Y10 F6000"]}],                   "released": [], "variables":  [{"key":"distance", "value":1}  ] }},  # front left corner, 10x10 in
            {"key":"KP2", "value":       {"pressed": [{"type":"printer", "gcode":["G91","G0 Y-<distance> F6000","G90"]}],  "released": [], "variables":  [{"key":"distance", "value":10} ] }},  # move south
            {"key":"KP3", "value":       {"pressed": [{"type":"printer", "gcode":["G0 X290 Y10 F6000"]}],                  "released": [], "variables":  [{"key":"distance", "value":100}] }},  # front right corner, 10x10 in
            {"key":"KP4", "value":       {"pressed": [{"type":"printer", "gcode":["G91","G0 X-<distance> F6000","G90"]}],  "released": [], "variables":  [{"key":"bed",      "value":0}  ] }},  # move west
            {"key":"KP5", "value":       {"pressed": [{"type":"printer", "gcode":["G0 X150 Y150 F6000"]}],                 "released": [], "variables":  [{"key":"bed",      "value":50} ] }},  # center
            {"key":"KP6", "value":       {"pressed": [{"type":"printer", "gcode":["G91","G0 X+<distance> F6000","G90"]}],  "released": [], "variables":  [{"key":"bed",      "value":60} ] }},  # move east
            {"key":"KP7", "value":       {"pressed": [{"type":"printer", "gcode":["G0 X10 Y290 F6000"]}],                  "released": [], "variables":  [{"key":"hotend",   "value":0}  ] }},  # rear left corner, 10x10 in
            {"key":"KP8", "value":       {"pressed": [{"type":"printer", "gcode":["G91","G0 Y+<distance> F6000","G90"]}],  "released": [], "variables":  [{"key":"hotend",   "value":205}] }},  # move north
            {"key":"KP9", "value":       {"pressed": [{"type":"printer", "gcode":["G0 X290 Y290 F6000"]}],                 "released": [], "variables":  [{"key":"hotend",   "value":210}] }},  # rear right corner, 10x10 in
            {"key":"KPPLUS", "value":    {"pressed": [{"type":"printer", "gcode":["G91","G0 Z-<distance> F300","G90"]}],   "released": [], "variables":  []                                }},  # move down
            {"key":"KPMINUS", "value":   {"pressed": [{"type":"printer", "gcode":["G91","G0 Z+<distance> F300","G90"]}],   "released": [], "variables":  []                                }},  # move up
            {"key":"KPASTERISK", "value":{"pressed": [{"type":"printer", "gcode":["G91","G1 E-<distance> F300","G90"]}],   "released": [], "variables":  []                                }},  # move up
            {"key":"BACKSPACE", "value": {"pressed": [{"type":"printer", "gcode":["G91","G1 E+<distance> F300","G90"]}],   "released": [], "variables":  []                                }},  # move up
            {"key":"KPSLASH", "value":   {"pressed": [{"type":"printer", "gcode":["M104 S<hotend>","M140 S<bed>"]}],       "released": [], "variables":  []                                }},  # set hotend and bed
            {"key":"ESC", "value":       {"pressed": [{"type":"psu", "command":"toggle", "hotend_max":50 }],               "released": [], "variables":  []                                }},  # turn off PSU if hotends < 50c
            # **************************** Mac ******************************
            {"key":".", "value":         {"pressed": [{"type":"listen_vars", "variables":["distance", "hotend", "bed"]}],  "released": [{"type":"save_vars", "variables":["distance", "hotend", "bed"]}], "variables":[]}},  # making this my variable modifier
            {"key":"\\x03", "value":     {"pressed": [{"type":"printer", "gcode":["G28 Z"]}],                              "released": [], "variables":  []                                }},# homing z
            {"key":"0", "value":         {"pressed": [{"type":"printer", "gcode":["G28 X Y"]}],                            "released": [], "variables":  [{"key":"distance", "value":0.1}] }},  # homing x, y
            {"key":"1", "value":         {"pressed": [{"type":"printer", "gcode":["G0 X10 Y10 F6000"]}],                   "released": [], "variables":  [{"key":"distance", "value":1}  ] }},  # front left corner, 10x10 in
            {"key":"2", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Y-<distance> F6000","G90"]}],  "released": [], "variables":  [{"key":"distance", "value":10} ] }},  # move south
            {"key":"3", "value":         {"pressed": [{"type":"printer", "gcode":["G0 X290 Y10 F6000"]}],                  "released": [], "variables":  [{"key":"distance", "value":100}] }},  # front right corner, 10x10 in
            {"key":"4", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 X-<distance> F6000","G90"]}],  "released": [], "variables":  [{"key":"bed",      "value":0}  ] }},  # move west
            {"key":"5", "value":         {"pressed": [{"type":"printer", "gcode":["G0 X150 Y150 F6000"]}],                 "released": [], "variables":  [{"key":"bed",      "value":50} ] }},  # center
            {"key":"6", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 X+<distance> F6000","G90"]}],  "released": [], "variables":  [{"key":"bed",      "value":60} ] }},  # move east
            {"key":"7", "value":         {"pressed": [{"type":"printer", "gcode":["G0 X10 Y290 F6000"]}],                  "released": [], "variables":  [{"key":"hotend",   "value":0}  ] }},  # rear left corner, 10x10 in
            {"key":"8", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Y+<distance> F6000","G90"]}],  "released": [], "variables":  [{"key":"hotend",   "value":205}] }},  # move north
            {"key":"9", "value":         {"pressed": [{"type":"printer", "gcode":["G0 X290 Y290 F6000"]}],                 "released": [], "variables":  [{"key":"hotend",   "value":210}] }},  # rear right corner, 10x10 in
            {"key":"+", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Z-<distance> F300","G90"]}],   "released": [], "variables":  []                                }},  # move down
            {"key":"-", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G0 Z+<distance> F300","G90"]}],   "released": [], "variables":  []                                }},  # move up
            {"key":"*", "value":         {"pressed": [{"type":"printer", "gcode":["G91","G1 E-<distance> F300","G90"]}],   "released": [], "variables":  []                                }},  # move up
            {"key":"backspace", "value": {"pressed": [{"type":"printer", "gcode":["G91","G1 E+<distance> F300","G90"]}],   "released": [], "variables":  []                                }},  # move up
            {"key":"/", "value":         {"pressed": [{"type":"printer", "gcode":["M104 S<hotend>","M140 S<bed>"]}],       "released": [], "variables":  []                                }},  # set hotend and bed
            {"key":"esc", "value":       {"pressed": [{"type":"psu", "command":"toggle", "hotend_max":50 }],               "released": [], "variables":  []                                }}   # turn off PSU if hotends < 50c
          ],
          "keyboard": [
              {"keys":["esc", None, "tab", "="]},
              {"keys":[None, "/", "*", "backspace"]},
              {"keys":["7", "8", "9", "-"]},
              {"keys":["4", "5", "6", "+"]},
              {"keys":["1", "2", "3", None]},
              {"keys":[None, "0", ".", "\\x03"]}
          ],
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
              key_discovery=["row", "column"]
          )

  def on_api_command(self, command, data):      
      if command == "key_discovery":
        self._logger.info(f"key_discovery called, row is {data['row']}, key is {data['column']}")
        self.key_discovery = data

  def on_api_get(self, request):
      return 'f{"last_key_pressed"="{self.last_key_pressed}"}'

  ##~~ AssetPlugin mixin

  def get_assets(self):
    # Define your plugin's asset files to automatically include in the
    # core UI here.
    return dict(
      js=["js/usb_keyboard.js"],
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
#__plugin_pythoncompat__ = ">=2.7,<3" # only python 2
__plugin_pythoncompat__ = ">=3,<4" # only python 3
#__plugin_pythoncompat__ = ">=2.7,<4" # python 2 and 3

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

