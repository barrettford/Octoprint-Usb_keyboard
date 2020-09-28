# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import octoprint.printer
import re
import json
import requests
import inspect
from .keyboard_listener import KeyboardListenerThread 
from octoprint.events import Events, eventManager, all_events





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
        # see https://github.com/OctoPrint/OctoPrint/blob/3ab84ed7e4c3aaaf71fe0f184b465f25d689f929/src/octoprint/plugin/__init__.py#L255
        active_profile = self._settings.get(["active_profile"])
        setting_var = self._settings.get(["profiles", active_profile, "variables", clean_variable], merged=False)
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
    
    
    active_profile = self._settings.get(["active_profile"])
    # self._logger.info(f"Key '{key}' {key_state}")
    
    commands = self._settings.get(["profiles", active_profile, "commands"])
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
              self._settings.set(["profiles", active_profile, "variables", variable], saving_var)
              # self._settings.save() #TODO figure out if I really want to save them here
            else:
              self._logger.info(f"Found nothing to save to variable '{variable}'.")
            del self.listening_variables[variable]
        continue # Go around again, nothing else to do here
        
        
      # ------------------ Listening Vars -------------------
      # handle if listening variables
      if self.listening_variables:
        self._logger.info(f"Listening for variables {self.listening_variables.keys()}.")
        key_values = key_actions.get("variable_values", None)
        
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
              can_trigger_while_hot = current_action.get("can_trigger_while_hot", False)
              tools_cool_enough_to_turn_off_psu = True
              hotend_max = current_action.get("hotend_max", 50)
              if not can_trigger_while_hot:
                printer_temps = self._printer.get_current_temperatures()
                self._logger.info(f"printer_temps '{printer_temps}'")
                for hot_thing, value in printer_temps.items():
                  self._logger.info(f"tool {hot_thing} '{value}'")
                  
                  if key.startswith("tool") and value.get("actual", 0) > hotend_max:
                    self._logger.info(f"tool {hot_thing} too hot")
                    
                    tools_cool_enough_to_turn_off_psu = False
                    break;
              if tools_cool_enough_to_turn_off_psu:
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
  
  def on_after_startup(self):
    self._logger.info("USB Keyboard loading")
    
    self.key_status = dict()
    self.key_discovery = {}
    self.last_key_pressed = None
    self.listening_variables = dict()
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
    self.listener.raise_exception()
    self.listener.join(0.1)
    self._logger.info("Stopped Keyboard Listener")
    

  ##~~ SettingsPlugin mixin

  def get_settings_defaults(self):
    # put your plugin's default settings here
    return dict(
      active_profile="default",
      
      profiles={
        "default":{
          "commands":{
            
            "KPDOT":  {"pressed": [{"type":"listen_vars", "variables":["distance", "hotend", "bed"]}],
                      "released": [{"type":"save_vars",   "variables":["distance", "hotend", "bed"]}]
            },  # making this my variable modifier
            "KPENTER":{"pressed": [{"type":"printer", "gcode":["G28 Z"]}]}, # homing z
            
            "KP0":    {"pressed": [{"type":"printer", "gcode":["G28 X Y"]}],                           "variable_values": {"distance":0.1}   },  # homing x, y
            "KP1":    {"pressed": [{"type":"printer", "gcode":["G0 X10 Y10 F6000"]}],                  "variable_values": {"distance":1}     },  # front left corner, 10x10 in
            "KP2":    {"pressed": [{"type":"printer", "gcode":["G91","G0 Y-<distance> F6000","G90"]}], "variable_values": {"distance":10}    },  # move south
            "KP3":    {"pressed": [{"type":"printer", "gcode":["G0 X290 Y10 F6000"]}],                 "variable_values": {"distance":100}   },  # front right corner, 10x10 in
            "KP4":    {"pressed": [{"type":"printer", "gcode":["G91","G0 X-<distance> F6000","G90"]}], "variable_values": {"bed":0}          },  # move west
            "KP5":    {"pressed": [{"type":"printer", "gcode":["G0 X150 Y150 F6000"]}],                "variable_values": {"bed":50}         },  # center
            "KP6":    {"pressed": [{"type":"printer", "gcode":["G91","G0 X+<distance> F6000","G90"]}], "variable_values": {"bed":60}         },  # move east
            "KP7":    {"pressed": [{"type":"printer", "gcode":["G0 X10 Y290 F6000"]}],                 "variable_values": {"hotend":0}       },  # rear left corner, 10x10 in
            "KP8":    {"pressed": [{"type":"printer", "gcode":["G91","G0 Y+<distance> F6000","G90"]}], "variable_values": {"hotend":205}     },  # move north
            "KP9":    {"pressed": [{"type":"printer", "gcode":["G0 X290 Y290 F6000"]}],                "variable_values": {"hotend":210}     },  # rear right corner, 10x10 in
            "KPPLUS": {"pressed": [{"type":"printer", "gcode":["G91","G0 Z-<distance> F300","G90"]}]                                         },  # move down
            "KPMINUS":{"pressed": [{"type":"printer", "gcode":["G91","G0 Z+<distance> F300","G90"]}]                                         },  # move up
            
            
            # "BACKSPACE":{"pressed":{"listen_vars":["bed","hotend"]}, "released":{"save_vars":["bed","hotend"]}},  # set temperatures for hotend and bed
            "EQUAL":  {"pressed": [{"type":"printer", "gcode":["M104 S<hotend>","M140 S<bed>"]}]                                             },  # set hotend and bed
            "ESC":    {"pressed": [{"type":"psu", "command":"toggle", "can_trigger_while_hot":False, "hotend_max":50 }]                      }
          },
          "keyboard":{
            "rows":[
              {"keys":["esc", None, "tab", "="]},
              {"keys":[None, "/", "*", "backspace"]},
              {"keys":["7", "8", "9", "-"]},
              {"keys":["4", "5", "6", "+"]},
              {"keys":["1", "2", "3", None]},
              {"keys":[None, "0", ".", "\\x03"]}
            ]
          },
          "variables":{
            "distance":"1",
            "bed":"60",
            "hotend":"210"
          }
        }
      }
    )
    
    
  ##~~ SimpleApi mixin
  
  def get_api_commands(self):
          return dict(
              key_discovery=["row", "key"]
          )

  def on_api_command(self, command, data):      
      if command == "key_discovery":
        self._logger.info(f"key_discovery called, row is {data['row']}, key is {data['key']}")
        self.key_discovery = data

  def on_api_get(self, request):
      return 'f{"last_key_pressed"="{self.last_key_pressed}"}'

  ##~~ AssetPlugin mixin

  def get_assets(self):
    # Define your plugin's asset files to automatically include in the
    # core UI here.
    return dict(
      js=["js/usb_keyboard.js"],
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

