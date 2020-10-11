/*
 * View model for OctoPrint-Usb_keyboard
 *
 * Author: Barrett Ford
 * License: AGPLv3
 */


$(function() {
  function Usb_keyboardViewModel(parameters) {
    var self = this;
    Expandable.call(self, "settings", ko.observable(true))

    // assign the injected parameters, e.g.:
    // self.loginStateViewModel = parameters[0];
    // self.settingsViewModel = parameters[1];
    
    self.settingsViewModel = parameters[0];
    self.activeProfileName = ko.observable();
    self.deviceQueryMessage = ko.observable();
    self.activeListeningText = ko.observableArray();
    self.devicePath = ko.observable();
    self.trialDevicePath = ko.observable();
    
    ko.extenders.numeric = function(target, precision) {
        //create a writable computed observable to intercept writes to our observable
        var result = ko.pureComputed({
            read: target,  //always return the original observables value
            write: function(newValue) {
                var current = target(),
                    roundingMultiplier = Math.pow(10, precision),
                    newValueAsNum = isNaN(newValue) ? 0 : +newValue,
                    valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;
 
                //only write if it changed
                if (valueToWrite !== current) {
                    target(valueToWrite);
                } else {
                    //if the rounded value is the same, but a different value was written, force a notification for the current field
                    if (newValue !== current) {
                        target.notifySubscribers(valueToWrite);
                    }
                }
            }
        }).extend({ notify: 'always' });
 
        //initialize with current value to make sure it is rounded appropriately
        result(target());
 
        //return the new computed observable
        return result;
    };
    
    function Lockable(description, locked) {
      var self = this
            
      self.lockProvided = ko.observable()
      if (locked != undefined) {
        self.lockProvided(true)
        self.locked = locked
      }
      else {
        self.locked = ko.observable(true);
        self.lockProvided(false)
      }
      
      self.description = description
      
      self.toggleLock = function() {
        self.locked(!self.locked());
        // console.log("Toggling " + description + " lock to " + (self.locked() ? 'locked' : 'unlocked'))
      }
      
      self.lockedClass = ko.pureComputed(function() {
        return self.locked() ? 'fa fa-lock' : 'fa fa-unlock';
      });
    }
    function Expandable(description, expanded) {
      var self = this

      self.expansionProvided = ko.observable()
      if (expanded != undefined) {
        self.expansionProvided(true)
        self.expanded = expanded
      }
      else {
        self.expanded = ko.observable(false);
        self.expansionProvided(false)
      }

      self.description = description

      self.toggleExpanded = function() {
        self.expanded(!self.expanded());
        // console.log("Toggling " + description + " expansion to " + (self.expanded() ? 'visible' : 'hidden'))
      }

      self.expandedClass = ko.pureComputed(function() {
        return self.expanded() ? 'fa fa-caret-down' : 'fa fa-caret-left';
      });
    }
    function SelfManaged(targetArray, selfObject) {
      var self = this
      
      self.selfObject = selfObject;
      self.targetArray = targetArray
      
      self.deleteSelf = function() {
        self.targetArray.remove(self.selfObject)
      }
      
      self.moveSelfUp = function() {
        var currentPosition = self.targetArray.indexOf(self.selfObject)
        
        if (!currentPosition == 0) {
          self.targetArray.remove(self.selfObject)
          self.targetArray.splice(currentPosition - 1, 0, self.selfObject)
        }
      }
      
      self.moveSelfDown = function() {
        var currentPosition = self.targetArray.indexOf(self.selfObject)
        var currentLastIndex = self.targetArray().length - 1
        
        if (currentPosition != currentLastIndex) {
          self.targetArray.remove(self.selfObject)
          self.targetArray.splice(currentPosition + 1, 0, self.selfObject)
        }
      }
    }
    function NonDuplicateAdd(targetArray, sendingKey) {
      
    }
    
    function KeyboardViewModel(params) {
      var self = this;
      Lockable.call(self, "keyboard")
      
      // console.log("Keyboard View Model raw", params)
      // console.log("Keyboard View Model self", self)

      self.keyboard = params.keyboard.board;
      self.keyboardScale = params.keyboard.scale;
      self.profile = params.profile;
      
      // self.keyboardScaleValue = ko.computed({
//           read: function() {
//             return self.keyboardScale();
//           },
//           write: function(newValue) {
//             self.keyboardScale(newValue);
//           },
//           owner: self
//         });

      // this will be called when the user clicks the "+ Row" button and add a new row of data
      self.addRow = function() {
        console.log("Clicked + row");
        self.keyboard.push({"keys":ko.observableArray([null])})
      };

      // this will be called when the user clicks the "+ Row" button and add a new row of data
      self.deleteRow = function() {
        console.log("Clicked - row");
        // TODO:  Put an "Are you sure?" dialog if the cell has config
        self.keyboard.pop()
      };
    }
    ko.components.register('sfr-keyboard', {
      viewModel: KeyboardViewModel,
      template: { element: 'template-sfr-keyboard' }
    });


    function KeyboardRowViewModel(params) {
      var self = this
      // console.log("Keyboard Row View Model raw", params)
      // console.log("Keyboard Row View Model self", self)
      
      self.keys = params.keys
      self.profile = params.profile
      self.row = params.row
      self.keyboardScale = params.keyboardScale
      self.locked = params.locked
      
      self.addKey = function() {
        console.log("Clicked + key");
        self.keys.push(null)
      };

      // this will be called when the user clicks the "+ Column" button and add a new column of data
      self.deleteKey = function() {
        console.log("Clicked - key");
        // TODO:  Put an "Are you sure?" dialog if the cell has config
        self.keys.pop()
      };
    }
    ko.components.register('sfr-keyboard-row', {
      viewModel: KeyboardRowViewModel,
      template: { element: 'template-sfr-keyboard-row' }
    });
    
    
    function KeyboardRowKeyViewModel(params) {
      var self = this
      // console.log("Keyboard Row Key View Model raw", params)
      // console.log("Keyboard Row Key View Model self", self)
      
      self.text = ko.observable(params.text)
      self.profile = params.profile
      self.row = params.row
      self.column = params.column
      self.locked = params.locked
      
      self.keyboardScale = params.keyboardScale
      
      self.calcWidth = ko.pureComputed(function() {
        return (15.5 * self.keyboardScale()).toString() + "px"
      });
      
      self.calcHeight = ko.pureComputed(function() {
        return (15 * self.keyboardScale()).toString() + "px"
      });
      
      
      self.configureKey = function() {
        console.log("Key '" + self.text() + "' pressed, [" + self.row() + "][" + self.column() + "] profile = " + self.profile())
      
        // TODO:  DON'T LOSE THIS
        OctoPrint.simpleApiCommand('usb_keyboard', 'key_discovery', {"row":self.row(), "column":self.column(), "profile":self.profile()});

        // self.keyDetectionBinding(null)
        // self.settings.settings.plugins.usb_keyboard.key_discovery(null)
        // self.settingsViewModel.saveData({plugins: {usb_keyboard: {key_discovery: {"row":row,"key":key}}}})
        // self.keyDetectionBinding(self.settings.settings.plugins.usb_keyboard.key_discovery())
        // console.log("self.keyDetectionBinding() ", self.keyDetectionBinding())
        // console.log("self.settings() ", self.settingsViewModel.settings.plugins.usb_keyboard.key_discovery)
      };
    }
    ko.components.register('sfr-keyboard-row-key', {
      viewModel: KeyboardRowKeyViewModel,
      template: { element: 'template-sfr-keyboard-row-key' }
    });
    
    
    function VariablesViewModel(params) {
      var self = this
      Lockable.call(self, "variables", params.locked)

      // console.log("VariablesViewModel raw", params)
      // console.log("VariablesViewModel self", self)
      
      self.newVariableKey = ko.observable(null)
      self.newVariableValue = ko.observable(null)
      self.dupeDetected = ko.observable(false)
      self.variables = params.variables
      
      
      this.deleteVariable = function(data, event) {
        console.log("data", data)
        self.variables.remove(data)
      }

      this.addVariable = function() {
        if (self.newVariableKey() == null || self.newVariableValue() == null) {
          return
        }

        self.dupeDetected(self.variables().some(function(value) {
          return value.key() == self.newVariableKey()
        }))

        if (! self.dupeDetected()) {
          self.variables.push({"key":ko.observable(self.newVariableKey()), "value":ko.observable(self.newVariableValue())})
          self.newVariableKey(null)
          self.newVariableValue(null)
        }
      }
    }
    ko.components.register('sfr-variables', {
      viewModel: VariablesViewModel,
      template: { element: 'template-sfr-variables' }
    });
    
    
    function CommandsViewModel(params) {
      var self = this
      // Lockable.call(self, "commands")
      //
      // console.log("CommandsViewModel raw", params)
      // console.log("CommandsViewModel self", self)
      //
      self.commands = params.commands
      self.profile = params.profile
      self.allowedVariables = params.allowedVariables
    }
    ko.components.register('sfr-commands', {
      viewModel: CommandsViewModel,
      template: { element: 'template-sfr-commands' }
    });
    
    
    function CommandsCommandViewModel(params) {
      var self = this
      Lockable.call(self, "commands")
      Expandable.call(self, "commands")
      SelfManaged.call(self, params.parentArray, params.commandObject)
      

      // console.log("CommandsCommandViewModel raw", params)
      // console.log("CommandsCommandViewModel self", self)
      
      self.profile = params.profile
      self.command = params.commandObject.key
      self.pressed = params.commandObject.value.pressed
      self.released = params.commandObject.value.released
      self.variables = params.commandObject.value.variables
      self.allowedVariables = params.allowedVariables
      self.allowedCommandActions = ["printer", "plugin_psucontrol", "save_vars", "listen_vars"]
      
      self.newCommandAction = ko.observable()
      
      self.createCommandAction = function(list) {
        var type = self.newCommandAction()
        var newCommandActionMap = {"type":type}
        switch(type) {
          case "printer":
            newCommandActionMap["gcode"] = []
            newCommandActionMap["send_while_printing"] = false
            break;
          case "save_vars":
          case "listen_vars":
            newCommandActionMap["variables"] = []
            break;
          case "plugin_psucontrol":
            newCommandActionMap["command"] = "on"
            newCommandActionMap["hotend_max"] = 50
            break;
          default:
            console.log("We should never get here...")
        } 
        
        list.push(ko.mapping.fromJS(newCommandActionMap))
        
        
      }
    }
    ko.components.register('sfr-commands-command', {
      viewModel: CommandsCommandViewModel,
      template: { element: 'template-sfr-commands-command' }
    });
    
    
    function CommandsCommandPrinterViewModel(params) {
      var self = this
      Lockable.call(self, "action", params.locked)
      SelfManaged.call(self, params.parentArray, params.commandActionObject)

      // console.log("CommandsCommandPrinterViewModel raw", params)
      // console.log("CommandsCommandPrinterViewModel self", self)
      
      self.profile = params.profile;
      self.type = params.commandActionObject.type;
      self.gcode = params.commandActionObject.gcode;
      self.sendWhilePrinting = params.commandActionObject.send_while_printing;
      
      // this will be called when the user clicks the "+ Row" button and add a new row of data
      self.addLine = function() {
        // console.log("Clicked + gcode line");
        self.gcode.push(ko.observableArray(""))
      };

      // this will be called when the user clicks the "+ Row" button and add a new row of data
      self.deleteLine = function() {
        // console.log("Clicked - gcode line");
        // TODO:  Put an "Are you sure?" dialog if the cell has config
        self.gcode.pop()
      };
      
    }
    ko.components.register('sfr-commands-command-printer', {
      viewModel: CommandsCommandPrinterViewModel,
      template: { element: 'template-sfr-commands-command-printer' }
    });
    
    
    function CommandsCommandListenSaveVarsViewModel(params) {
      var self = this
      Lockable.call(self, "action", params.locked)
      SelfManaged.call(self, params.parentArray, params.commandActionObject)
      
      //
      // console.log("CommandsCommandListenSaveVarsViewModel raw", params)
      // console.log("CommandsCommandListenSaveVarsViewModel self", self)
      
      self.profile = params.profile;
      self.allowedVariables = params.allowedVariables;
      self.type = params.commandActionObject.type;
      self.variables = params.commandActionObject.variables;
    }
    ko.components.register('sfr-commands-command-listen-save-vars', {
      viewModel: CommandsCommandListenSaveVarsViewModel,
      template: { element: 'template-sfr-commands-command-listen-save-vars' }
    });
    
    
    function CommandsCommandVariablesViewModel(params) {
      var self = this
      Lockable.call(self, "action", params.locked)
      //
      // console.log("CommandsCommandVariablesViewModel raw", params)
      // console.log("CommandsCommandVariablesViewModel self", self)
      
      self.profile = params.profile;
      self.variables = params.variables;
      self.allowedVariables = params.allowedVariables
      self.newVariableKey = ko.observable(null)
      self.newVariableValue = ko.observable(null)
      
      // This will be used by every variable-selecting command
      self.localAllowedVariables = ko.pureComputed(function() {
        var variableNames = []
        self.variables().some(function(value) {
          variableNames.push(value.key)
        });
        
        variableNames = ko.toJS(variableNames)
        return ko.toJS(self.allowedVariables()).filter(function(value, index, arr) {
          return variableNames.indexOf(value) == -1
        });
      });
      
      this.deleteVariable = function(variable, index) {
        self.variables.splice(index, 1)
      }

      this.addVariable = function() {
        if (self.newVariableKey() == null || self.newVariableValue() == null) {
          return
        }
        self.variables.push({"key":ko.observable(self.newVariableKey()), "value":ko.observable(self.newVariableValue())})
        self.newVariableKey(null)
        self.newVariableValue(null)
      }
    }
    ko.components.register('sfr-commands-command-variables', {
      viewModel: CommandsCommandVariablesViewModel,
      template: { element: 'template-sfr-commands-command-variables' }
    });
    
    
    function CommandsCommandPluginPsucontrolViewModel(params) {
      var self = this
      Lockable.call(self, "action", params.locked)
      SelfManaged.call(self, params.parentArray, params.commandActionObject)
      

      // console.log("CommandsCommandPluginPsucontrolViewModel raw", params)
      // console.log("CommandsCommandPluginPsucontrolViewModel self", self)
      
      self.profile = params.profile;
      self.type = params.commandActionObject.type;
      self.command = params.commandActionObject.command;
      self.hotendMax = params.commandActionObject.hotend_max.extend({ numeric: 0 });
      self.supportedCommands = ["on", "off", "toggle"]
    }
    ko.components.register('sfr-commands-command-plugin-psucontrol', {
      viewModel: CommandsCommandPluginPsucontrolViewModel,
      template: { element: 'template-sfr-commands-command-plugin-psucontrol' }
    });
    
    
    function ProfileViewModel(params) {
      var self = this
      Lockable.call(self, "profile")
            //
      // console.log("ProfileViewModel raw", params)
      // console.log("ProfileViewModel self", self)
      
      // self.variables = ko.observable(params.variables)
      self.activeProfileName = params.activeProfileName
      self.profile = params.profileObject.key
      self.profileNames = params.profileNames
      self.profileObject = params.profileObject
      self.profileArray = params.profileArray
      self.commands = params.profileObject.value.commands
      self.variables = params.profileObject.value.variables
      self.keyboard = params.profileObject.value.keyboard
      self.dupeDetected = ko.observable(false)
      
      self.newProfileName = ko.observable(self.profile())
      
      // This will be used by every variable-selecting command
      self.allowedVariables = ko.pureComputed(function() {
        var allowedVariables = []        
        self.variables().some(function(value) {
          allowedVariables.push(value.key)
        })
        
        return allowedVariables
      });
      
      self.duplicateProfile = function() {
        var copyName = self.profile() + " copy"
        
        self.dupeDetected(self.profileNames().some(function(value) {
          return value() == copyName
        }))
        
        if (! self.dupeDetected()) {
          var newProfile = ko.mapping.fromJS(ko.toJS(self.profileObject))
          newProfile.key(copyName)
          
          self.profileArray.push(newProfile)
          self.activeProfileName(copyName)
        }
      };
      
      self.editProfileName = function() {
        
        if (self.profile() != self.newProfileName()) {
          self.dupeDetected(self.profileNames().some(function(value) {
            return value() == self.newProfileName()
          }))
          
          if (! self.dupeDetected()) {
            self.profile(self.newProfileName())
            self.activeProfileName(self.newProfileName())
          }
        }
      }
      
      self.deleteProfile = function() {
        self.profileArray.remove(self.profileObject)
      }
      
    }
    ko.components.register('sfr-profile', {
      viewModel: ProfileViewModel,
      template: { element: 'template-sfr-profile' }
    });
    
    self.dupeDetected = ko.observable(false)
    self.createProfile = function() {
      var newProfileName = "New Profile"
      
      var dupeDetected = self.profileNames().some(function(value) {
        return value() == newProfileName
      })
      
      if (! dupeDetected) {
        var newProfile = ko.mapping.fromJS({"key":newProfileName,
        "value":{ "commands":[],
                  "keyboard":{
                    "scale": 3,
                    "board": [{"keys":[null]}]
                  },
                  "variables":[]
                }});
        newProfile.key(newProfileName)
        
        self.profiles.push(newProfile)
        self.activeProfileName(newProfileName)
      }
    };
    
    self.profileNames = ko.pureComputed(function() {
      var profileNames = []
      
      function collectProfileNames(value, index, array) {
        profileNames.push(value["key"])
      }
      
      self.profiles().forEach(collectProfileNames);

      return profileNames
    });//.extend({ notify: 'always' });
    self.configuringDevice = ko.observable(false)
    
    self.configureDevice = function() {
      self.configuringDevice(!self.configuringDevice())
      
      if (self.configuringDevice()) {
        OctoPrint.simpleApiCommand('usb_keyboard', 'query_devices', {});
        console.log("Turning on listening...")
        OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"start"});
        $('#UsbDeviceConfigModal').modal('show');
      }
      else {
        $('#UsbDeviceConfigModal').modal('hide');
      }
    }
    
    self.changeDevicePath = function() {
      if (self.devicePath() != self.trialDevicePath()) {
        self.devicePath(self.trialDevicePath())
        OctoPrint.simpleApiCommand('usb_keyboard', 'change_device_path', {"device_path":self.devicePath()});
      }
      
    }

    self.devicePathOptions = ko.observableArray()

    self.onBeforeBinding = function() {
      console.log("Settings", self.settingsViewModel.settings.plugins.usb_keyboard)
      
      self.activeProfileName = self.settingsViewModel.settings.plugins.usb_keyboard.active_profile;
      self.profiles = self.settingsViewModel.settings.plugins.usb_keyboard.profiles
      self.devicePath = self.settingsViewModel.settings.plugins.usb_keyboard.device_path
      
      
      $( "#UsbDeviceConfigModal" ).on('hidden', self.configureDevice);
      $('#settings_plugin_usb_keyboard_link > a').on('click', function(){
        console.log("Turning on listening...")
        OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"start"});
      });
        
        //<a href="#settings_plugin_usb_keyboard" data-toggle="tab">USB Keyboard</a>
      
      
      // $( "#UsbDeviceConfigModal" ).on('shown', function(){
      //     alert("I want this to appear after the modal has opened!");
      // });
      
      // self.profiles(self.settingsViewModel.settings.plugins.usb_keyboard.profiles)
      
      // self.deviceConfiguration = ko.computed(function() {
      //   if (self.expanded() == true) {
      //     console.log("Turning on listening...")
      //     OctoPrint.simpleApiCommand('usb_keyboard', 'query_devices', {});
      //     OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"start"});
      //   }
      //   else {
      //     console.log("Turning off listening...")
      //     OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"stop"});
      //   }
      //   return self.deviceQueryMessage()
      // });
    }
    
    self.onSettingsShown = function() {
      // console.log("Turning on listening...")
      // OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"start"});
    }
    
    self.onSettingsBeforeSave = function() {
      console.log("Settings saving", self.settingsViewModel.settings.plugins.usb_keyboard)
      
      console.log("Turning off listening...")
      OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"stop"});
      
      
      
      
      // TODO: remove duplicate profile names
      // self.settingsViewModel.settings.plugins.usb_keyboard.profiles = self.profiles;
    }

    
    self.onSettingsHidden = function() {
      console.log("Settings closed", self.settingsViewModel.settings.plugins.usb_keyboard)
      
      console.log("Turning off listening...")
      OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"stop"});
      
      
      $('#settings_plugin_usb_keyboard button.fa-unlock').trigger('click');     // Lock all locks
      $('#settings_plugin_usb_keyboard button.fa-caret-down').trigger('click'); // Contract all expansions
    }
    
    // Key Discovery coming back
    self.onDataUpdaterPluginMessage = function (plugin, data) {
      if (plugin !== "usb_keyboard") {
        return;
      }
      
      switch(data["reply"]) {
        case "key_discovery":
          var row = data["row"]
          var column = data["column"]
          var keyName = data["name"]
          var profile = data["profile"]
          
          var targetedProfileIndex = 0
            
          // function findTargetedProfile(value, index, array) {
//             if (value.key() == profile) {
//               targetedProfileIndex = index;
//             }
//           }
//           self.profiles().forEach(findTargetedProfile);
          
          self.profiles().some(function(value) {
            if (value.key() == profile) {
              console.log("Key targeted ", self.profiles()[targetedProfileIndex].value.keyboard.board()[row].keys()[column]);
              value.value.keyboard.board()[row].keys.splice(column, 1, keyName)
              return true
            }
          })
      
          // console.log("Key targeted ", self.profiles()[targetedProfileIndex].value.keyboard()[row].keys()[column]);
//
//           self.profiles()[targetedProfileIndex].value.keyboard()[row].keys.splice(column, 1, keyName)
          break;
        case "query_devices":
          // console.log("Getting info about attached USB devices", data)
          
          self.deviceQueryMessage(data["message"])
          self.devicePathOptions(data["options"])
          break;
        case "active_listening":
          // console.log("Getting key event", data)
          key = data["key"]
          keyState = data["key_state"]
          self.activeListeningText.unshift("'" + key + "' " + keyState)
          if (self.activeListeningText().length > 10) {
            self.activeListeningText.pop()
          }
          break;
        default:
          console.log("Unknown reply from backend...")
      } 
      

      
      
      
      // console.log("Data", plugin, data);
      // TODO:  Fix this!
      
      
      
      // console.log("self.profiles()", self.profiles());
      // console.log("self.profiles()", self.profiles());
      // console.log("self.profiles()", self.profiles()[data["profile"]].value.keyboard()[data["row"]].keys()[data["column"]] );
      
      
      // self.profiles()[data["profile"]].value.keyboard()[data["row"]].keys.splice(data["column"], 1, data["name"]);
      
      // self.profiles[data["profile"]].keyboard()[data["row"]].keys.splice(data["column"], 1, data["name"]);
      // self.profiles[data["profile"]].keyboard()[data["row"]].keys.valueHasMutated();
    }
    
    ko.bindingHandlers['keyvalue'] = {
      makeTemplateValueAccessor: function(valueAccessor) {
          return function() {
              var values = ko.unwrap(valueAccessor());
              var array = [];
              for (var key in values)
                  array.push({key: key, value: values[key]});
              return array;
          };
      },
      'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        return ko.bindingHandlers['foreach']['init'](element, ko.bindingHandlers['keyvalue'].makeTemplateValueAccessor(valueAccessor));
      },
      'update': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        return ko.bindingHandlers['foreach']['update'](element, ko.bindingHandlers['keyvalue'].makeTemplateValueAccessor(valueAccessor), allBindings, viewModel, bindingContext);
      }
    };
    
    // var templateFromUrlLoader = {
    //   loadTemplate: function(name, templateConfig, callback) {
    //     if (templateConfig.fromUrl) {
    //       // Uses jQuery's ajax facility to load the markup from a file
    //       var fullUrl = '/plugins/usb_keyboard/static/js/templates/' + templateConfig.fromUrl + '?cacheAge=' + templateConfig.maxCacheAge;
    //       $.get(fullUrl, function(markupString) {
    //           // We need an array of DOM nodes, not a string.
    //           // We can use the default loader to convert to the
    //           // required format.
    //           ko.components.defaultLoader.loadTemplate(name, markupString, callback);
    //       });
    //     } else {
    //       // Unrecognized config format. Let another loader handle it.
    //       callback(null);
    //     }
    //   }
    // };
    //
    // // Register it
    // ko.components.loaders.unshift(templateFromUrlLoader);
    //
    // var viewModelCustomLoader = {
    //   loadViewModel: function(name, viewModelConfig, callback) {
    //     if (viewModelConfig.viaLoader) {
    //       // You could use arbitrary logic, e.g., a third-party
    //       // code loader, to asynchronously supply the constructor.
    //       // For this example, just use a hard-coded constructor function.
    //       var viewModelConstructor = function(params) {
    //         console.log("Via Loader Params", params)
    //           this.prop1 = 123;
    //       };
    //
    //       // We need a createViewModel function, not a plain constructor.
    //       // We can use the default loader to convert to the
    //       // required format.
    //       ko.components.defaultLoader.loadViewModel(name, viewModelConstructor, callback);
    //     } else {
    //       // Unrecognized config format. Let another loader handle it.
    //       callback(null);
    //     }
    //   }
    // };
    //
    // // Register it
    // ko.components.loaders.unshift(viewModelCustomLoader);
  }

  /* view model class, parameters for constructor, container to bind to
   * Please see http://docs.octoprint.org/en/master/plugins/viewmodels.html#registering-custom-viewmodels for more details
   * and a full list of the available options.
   */
  OCTOPRINT_VIEWMODELS.push({
    construct: Usb_keyboardViewModel,
    // ViewModels your plugin depends on, e.g. loginStateViewModel, settingsViewModel, ...
    dependencies: ["settingsViewModel" /* "loginStateViewModel", "settingsViewModel" */ ],
    // Elements to bind to, e.g. #settings_plugin_usb_keyboard, #tab_plugin_usb_keyboard, ...
    elements: ["#settings_plugin_usb_keyboard"]
  });
});


