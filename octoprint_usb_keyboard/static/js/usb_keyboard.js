/*
 * View model for OctoPrint-Usb_keyboard
 *
 * Author: Barrett Ford
 * License: AGPLv3
 */

var CURRENT_KEY = ko.observable(null)

$(function() {
  function Usb_keyboardViewModel(parameters) {
    var self = this;
    Expandable.call(self, "settings", ko.observable(true))
    ShowsInfo.call(self)

    // var KEY_DISCOVERY_LIST = []


    // assign the injected parameters, e.g.:
    // self.loginStateViewModel = parameters[0];
    // self.settingsViewModel = parameters[1];

    self.settingsViewModel = parameters[0];
    self.activeProfileName = ko.observable();
    self.deviceQueryMessage = ko.observable();
    self.activeListeningText = ko.observableArray();
    self.devicePath = ko.observable();
    self.trialDevicePath = ko.observable();
    self.currentKey = ko.observable(null);
    self.keyDiscovery = []


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
          self.targetArray.splice(currentPosition - 1, 0, self.selfObject)
          self.targetArray.splice(currentPosition + 1, 1)
        }
      }

      self.moveSelfDown = function() {
        var currentPosition = self.targetArray.indexOf(self.selfObject)
        var currentLastIndex = self.targetArray().length - 1

        if (currentPosition != currentLastIndex) {
          self.targetArray.splice(currentPosition + 2, 0, self.selfObject)
          self.targetArray.splice(currentPosition, 1)
        }
      }
    }
    function KeyDiscoverable(keyField, root) {
      var self = this

      self.key = keyField;
      self.root = root;

      self.setKey = function(value) {
        self.key(value)
      }

      self.keyDiscovery = function(data, event) {

        // console.log("data", data)
        // console.log("event", event)

        self.root.keyDiscovery.push(self)

        // TODO:  DON'T LOSE THIS
        OctoPrint.simpleApiCommand('usb_keyboard', 'key_discovery', {});// {"row":self.row(), "column":self.column(), "profile":self.profile()});

      };
    }
    function ShowsInfo() {
      var self = this

      self.hovering = ko.observable(false)
      self.clicked = ko.observable(false)
      self.infoSlider = ko.observable() // Not used for anything, just lets sliders bind to something.

      self.showingInfo = ko.pureComputed(function() {
        return self.hovering() || self.clicked();
      });

      self.showInfo = function() {
        self.hovering(true);
      }

      self.hideInfo = function() {
        self.hovering(false);
      }

      self.toggleInfo = function() {
        self.clicked(!self.clicked());
      }

      self.infoClass = ko.pureComputed(function() {
        return self.showingInfo() ? 'btn-warning fa fa-info-circle' : 'btn-info fa fa-info';
      });
    }

    function KeyboardViewModel(params) {
      var self = this;
      Lockable.call(self, "keyboard")
      ShowsInfo.call(self)

      // console.log("Keyboard View Model raw", params)
      // console.log("Keyboard View Model self", self)

      self.keyboardRows = params.keyboard.board;
      self.editingKey = ko.observable(null);
      self.keyboardScale = params.keyboard.scale;
      self.commands = params.commands;
      self.profile = params.profile;

      self.spacerCount = ko.pureComputed(function() {
        var maxRowSize = 0;


        self.keyboardRows().forEach(function(value, index, array) {
          var keys = value.keys();
          var rowSize = 0;

          keys.forEach(function(value, index, array) {
            rowSize += value.w()
          });

          if (rowSize > maxRowSize) {
            maxRowSize = rowSize;
          }
        });

        return maxRowSize * 4;
      });

      self.spacerWidth = ko.pureComputed(function() {
        return (self.keyboardScale() * 15)/4;
      });




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
        self.keyboardRows.push(ko.mapping.fromJS({"keys":[{"key":null, "alias":null, "w":1, "h":1}]}))
      };

      // this will be called when the user clicks the "+ Row" button and add a new row of data
      self.deleteRow = function() {
        console.log("Clicked - row");
        // TODO:  Put an "Are you sure?" dialog if the cell has config
        self.keyboardRows.pop()
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
      self.editingKey = params.editingKey;
      self.commands = params.commands;
      self.profile = params.profile
      self.row = params.row
      self.keyboardScale = params.keyboardScale
      self.locked = params.locked


      self.addKey = function() {
        self.keys.push(ko.mapping.fromJS({"key":null, "alias":null, "w":1, "h":1}))
      };

      // this will be called when the user clicks the "+ Column" button and add a new column of data
      self.deleteKey = function() {
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
      KeyDiscoverable.call(self, params.keyData.key, params.root)
      ShowsInfo.call(self)

      // console.log("Keyboard Row Key View Model raw", params)
      // console.log("Keyboard Row Key View Model self", self)


      self.widthScale = params.keyData.w
      self.heightScale = params.keyData.h
      self.alias = params.keyData.alias
      self.editingKey = params.editingKey
      self.commands = params.commands

      self.profile = params.profile
      self.row = params.row
      self.column = params.column
      self.locked = params.locked

      self.keyboardScale = params.keyboardScale

      self.rowSpan = ko.pureComputed(function() {
        return self.heightScale()
      });

      self.colSpan = ko.pureComputed(function() {
        return self.widthScale() * 4
      });

      self.keyText = ko.pureComputed(function() {
        return ((self.alias() == null || self.alias() === "") ? self.key() : self.alias())
      });

      self.clearKey = function() {
        self.setKey(null)
        self.widthScale(1)
        self.heightScale(1)
      }

      self.calcWidth = ko.pureComputed(function() {
        return (15 * self.widthScale() * self.keyboardScale()).toString() + "px"
      });

      self.calcHeight = ko.pureComputed(function() {
        return (15 * self.heightScale() * self.keyboardScale()).toString() + "px"
      });

      // self.keyModalId = ko.pureComputed(function() {
      //   return "SingleKeyRow" + (self.row()).toString() + "Col" + (self.column()).toString() + "Key" + self.key()
      // });

      self.editKey = function() {
        // console.log("Id", self.keyModalId())
        // self.editingKey(true)
        self.editingKey(self)
        // $('#SingleKeyModal').modal('show');
      };

      self.clearEditingKey = function() {
        // console.log("Id", self.keyModalId())
        // self.editingKey(true)
        self.editingKey(null)
        // $('#SingleKeyModal').modal('show');
      };

      self.addCommand = function() {
        var newCommand = self.editingKey()
        var dupeCommand = null;

        self.commands().some(function(value) {
          if (value.key() == newCommand.key()) {
            dupeCommand = value;
            return true;
          }
        });

        if (dupeCommand != null) {
          dupeCommand.alias(self.alias());
          self.commands.remove(dupeCommand);
          self.commands.unshift(dupeCommand);
        }
        else {
          self.commands.unshift(
            ko.mapping.fromJS(
              {
                "key":newCommand.key,
                "alias":newCommand.alias,
                "value":{"pressed":[], "released":[], "variables":[]}
              }
            )
          );
        }
      }
    }
    ko.components.register('sfr-keyboard-row-key', {
      viewModel: KeyboardRowKeyViewModel,
      template: { element: 'template-sfr-keyboard-row-key' }
    });


    function VariablesViewModel(params) {
      var self = this
      Lockable.call(self, "variables", params.locked)
      ShowsInfo.call(self)

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
      ShowsInfo.call(self)

      // Lockable.call(self, "commands")
      //
      // console.log("CommandsViewModel raw", params)
      // console.log("CommandsViewModel self", self)
      //
      self.commands = params.commands
      self.profile = params.profile
      self.profileNames = params.profileNames
      self.allowedVariables = params.allowedVariables

      self.createCommand = function() {
        var newCommand = "NEW COMMAND"
        var dupeCommand = null;

        self.commands().some(function(value) {
          if (value.key() == newCommand) {
            dupeCommand = value;
            return true;
          }
        });

        if (dupeCommand != null) {
          self.commands.remove(dupeCommand);
          self.commands.unshift(dupeCommand);
        }
        else {
          self.commands.unshift(
            ko.mapping.fromJS(
              {
                "key":newCommand,
                "alias":null,
                "value":{"pressed":[], "released":[], "variables":[]}
              }
            )
          );
        }
      }

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
      KeyDiscoverable.call(self, params.commandObject.key, params.root)
      ShowsInfo.call(self)
      // console.log("CommandsCommandViewModel raw", params)
      // console.log("CommandsCommandViewModel self", self)

      self.profile = params.profile
      self.profileNames = params.profileNames
      self.command = params.commandObject.key
      self.alias = params.commandObject.alias
      self.pressed = params.commandObject.value.pressed
      self.released = params.commandObject.value.released
      self.variables = params.commandObject.value.variables
      self.allowedVariables = params.allowedVariables
      self.allowedCommandActions = ["octoprint", "printer", "plugin_psucontrol", "save_vars", "listen_vars", "set_active_profile"]

      self.commandText = ko.pureComputed(function() {
        if (self.alias() == null || self.alias === "") {
          return self.command();
        }
        return self.alias() + " '" + self.command() + "'";
      });

      self.newCommandAction = ko.observable()

      self.createCommandAction = function(list) {
        var type = self.newCommandAction()
        var newCommandActionMap = {"type":type}
        switch(type) {
          case "printer":
            newCommandActionMap["gcode"] = []
            newCommandActionMap["options"] = ""
            break;
          case "save_vars":
          case "listen_vars":
            newCommandActionMap["variables"] = []
            break;
          case "plugin_psucontrol":
            newCommandActionMap["command"] = "on"
            newCommandActionMap["hotend_max"] = 50
            break;
          case "octoprint":
            newCommandActionMap["command"] = "cancel_print"
            newCommandActionMap["presses_required"] = 5
            break;
          case "set_active_profile":
            newCommandActionMap["command"] = "set_active_profile"
            newCommandActionMap["profile"] = null
            break;
          default:
            console.log("We should never get here...")
        }

        list.push(ko.mapping.fromJS(newCommandActionMap))
      }

      self.clearKey = function() {
        self.setKey(null)
      }
    }
    ko.components.register('sfr-commands-command', {
      viewModel: CommandsCommandViewModel,
      template: { element: 'template-sfr-commands-command' }
    });


    function CommandsCommandPrinterGcodeViewModel(params) {
      var self = this
      Lockable.call(self, "gcode", params.locked)
      SelfManaged.call(self, params.parentArray, params.gcodeCommand)
      // console.log("CommandsCommandPrinterGcodeViewModel raw", params)
      // console.log("CommandsCommandPrinterGcodeViewModel self", self)

      self.profile = params.profile;
      self.gcodeCommand = params.gcodeCommand;
      self.id = self.gcodeCommand.id;
      self.code = self.gcodeCommand.code;
    }
    ko.components.register('sfr-commands-command-printer-gcode', {
      viewModel: CommandsCommandPrinterGcodeViewModel,
      template: { element: 'template-sfr-commands-command-printer-gcode' }
    });


    function CommandsCommandPrinterOptionsViewModel(params) {
      var self = this
      Lockable.call(self, "gcode options", params.locked)
      SelfManaged.call(self, params.parentArray, params.options)
      Expandable.call(self, "gcode options")
      ShowsInfo.call(self)

      const PRINTING = "p"
      const PAUSED = "u"
      const FORCE = "f"
      // console.log("CommandsCommandPrinterOptionsViewModel raw", params)
      // console.log("CommandsCommandPrinterOptionsViewModel self", self)


      self.profile = params.profile;
      self.options = params.options;


      self.sendWhilePrinting = ko.pureComputed(function() {
        return self.options().includes(PRINTING);
      });

      self.sendWhilePaused = ko.pureComputed(function() {
        return self.options().includes(PAUSED);
      });

      self.forceSend = ko.pureComputed(function() {
        return self.options().includes(FORCE);
      });


      // Toggling the Options

      self.toggleOption = function(option) {
        var options = self.options()
        if (options.includes(option)) {
          options = options.replace(option, "")
        }
        else {
          options = options + option
        }

        self.options(options)
      }

      self.toggleSendWhilePrinting = function() {
        self.toggleOption(PRINTING)
      }

      self.toggleSendWhilePaused = function() {
        self.toggleOption(PAUSED)
      }

      self.toggleForceSend = function() {
        self.toggleOption(FORCE)
      }


      // Button appearance

      self.sendWhilePrintingClass = ko.pureComputed(function() {
        return self.sendWhilePrinting() ? 'btn-success fa-check' : 'fa-times' ;
      });

      self.sendWhilePausedClass = ko.pureComputed(function() {
        return self.sendWhilePaused() ? 'btn-success fa-check' : 'fa-times' ;
      });

      self.forceSendClass = ko.pureComputed(function() {
        return self.forceSend() ? 'btn-success fa-check' : 'fa-times' ;
      });


    }
    ko.components.register('sfr-commands-command-printer-options', {
      viewModel: CommandsCommandPrinterOptionsViewModel,
      template: { element: 'template-sfr-commands-command-printer-options' }
    });


    function CommandsCommandPrinterViewModel(params) {
      var self = this
      Lockable.call(self, "action", params.locked)
      SelfManaged.call(self, params.parentArray, params.commandActionObject)
      ShowsInfo.call(self)
      // console.log("CommandsCommandPrinterViewModel raw", params)
      // console.log("CommandsCommandPrinterViewModel self", self)

      self.profile = params.profile;
      self.type = params.commandActionObject.type;
      self.gcode = params.commandActionObject.gcode;
      self.options = params.commandActionObject.options;

      // this will be called when the user clicks the "+" button and add a new row of gcode
      self.addLine = function() {
        self.gcode.push(ko.mapping.fromJS({"code":null, "id":Math.floor((Math.random() * 65535))}));
      };
    }
    ko.components.register('sfr-commands-command-printer', {
      viewModel: CommandsCommandPrinterViewModel,
      template: { element: 'template-sfr-commands-command-printer' }
    });


    function CommandsCommandSetActiveProfileViewModel(params) {
      var self = this
      Lockable.call(self, "action", params.locked)
      SelfManaged.call(self, params.parentArray, params.commandActionObject)
      ShowsInfo.call(self)
      // console.log("CommandsCommandSetActiveProfileViewModel raw", params)
      // console.log("CommandsCommandSetActiveProfileViewModel self", self)

      self.profile = params.profile;
      self.profileNames = params.profileNames;
      self.type = params.commandActionObject.type;
      self.profileName = params.commandActionObject.profile;

      self.allowedProfiles = ko.pureComputed(function() {
        var allowedProfiles = ko.toJS(self.profileNames())
        allowedProfiles.splice(allowedProfiles.indexOf(self.profile()), 1)
        return allowedProfiles
      });
    }
    ko.components.register('sfr-commands-command-set-active-profile', {
      viewModel: CommandsCommandSetActiveProfileViewModel,
      template: { element: 'template-sfr-commands-command-set-active-profile' }
    });

    function CommandsCommandListenSaveVarsViewModel(params) {
      var self = this
      Lockable.call(self, "action", params.locked)
      SelfManaged.call(self, params.parentArray, params.commandActionObject)
      ShowsInfo.call(self)
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
      ShowsInfo.call(self)

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

      this.deleteVariable = function(obj, variable) {
        self.variables.splice(self.variables.indexOf(variable), 1)
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
      ShowsInfo.call(self)


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


    function CommandsCommandOctoprintViewModel(params) {
      var self = this
      Lockable.call(self, "action", params.locked)
      SelfManaged.call(self, params.parentArray, params.commandActionObject)
      ShowsInfo.call(self)


      // console.log("CommandsCommandOctoprintViewModel raw", params)
      // console.log("CommandsCommandOctoprintViewModel self", self)

      self.profile = params.profile;
      self.type = params.commandActionObject.type;
      self.command = params.commandActionObject.command;
      self.presses_required = params.commandActionObject.presses_required.extend({ numeric: 0 });
      self.supportedCommands = ["cancel_print", "confirm_last_command", "pause_print", "resume_print", "start_print", "toggle_pause_print"]
    }
    ko.components.register('sfr-commands-command-octoprint', {
      viewModel: CommandsCommandOctoprintViewModel,
      template: { element: 'template-sfr-commands-command-octoprint' }
    });


    function ProfileViewModel(params) {
      var self = this
      Lockable.call(self, "profile")
      SelfManaged.call(self, params.profileArray, params.profileObject)
      ShowsInfo.call(self)
      // console.log("ProfileViewModel raw", params)
      // console.log("ProfileViewModel self", self)

      self.activeProfileName = params.activeProfileName
      self.profile = params.profileObject.key
      self.description = params.profileObject.value.description
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
        var copyName = preventDuplicateProfileNames(self.profile(), null)

        var newProfile = ko.mapping.fromJS(ko.toJS(self.profileObject))
        newProfile.key(copyName)

        self.profileArray.push(newProfile)
        self.activeProfileName(copyName)
      }

      self.editProfileName = function() {
        var newName = self.newProfileName()

        if (newName == self.profile()) {
          return
        }

        newName = preventDuplicateProfileNames(newName, self.profile())
        self.newProfileName(newName)

        if (newName == self.profile()) {
          return
        }

        self.profile(newName)
        self.activeProfileName(newName)
      }

      self.exportProfileData = ko.pureComputed(function() {
        return "data:text/json;charset=utf-8," + encodeURIComponent(ko.toJSON(self.profileObject))
      });

      self.exportProfileName = ko.pureComputed(function() {
        return self.profile() + ".json"
      });
    }
    ko.components.register('sfr-profile', {
      viewModel: ProfileViewModel,
      template: { element: 'template-sfr-profile' }
    });

    self.dupeDetected = ko.observable(false)
    self.createProfile = function() {
      var newProfileName = preventDuplicateProfileNames("New Profile", null)

      var newProfile = ko.mapping.fromJS({"key":newProfileName,
      "value":{ "description":null,
                "commands":[],
                "keyboard":{
                  "scale": 3,
                  "board": [
                    {"keys":[
                      {"key":null, "alias":null, "w":1, "h":1}
                    ]}
                  ]
                },
                "variables":[]
              }});
      newProfile.key(newProfileName)

      self.profiles.push(newProfile)
      self.activeProfileName(newProfileName)
    };

    preventDuplicateProfileNames = function(newName, currentName) {
      for (name = newName;
        ko.toJS(self.profileNames).indexOf(newName) > -1;
        newName = "*" + newName) {
          if (newName == currentName) {
            break
          }
      }
      return newName
    }

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

    self.fileData = ko.observable();
    self.fileName = ko.observable();

    self.fileData.subscribe(function() {
      if (self.fileData() == null) {
        return
      }

      const searchFor = "base64,";

      var fileData = self.fileData();
      var index = fileData.indexOf(searchFor);

      if (index < 0) {
        return // Error string "Not a valid profile"?
      }

      var str = fileData.substring(index + searchFor.length)

      var parsed_json = JSON.parse(decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')))

      parsed_json.key = preventDuplicateProfileNames(parsed_json.key, null)

      self.profiles.push(ko.mapping.fromJS(parsed_json))
      self.activeProfileName(parsed_json.key)
    });

    self.devicePathOptions = ko.observableArray()

    self.onBeforeBinding = function() {
      // console.log("Settings", self.settingsViewModel.settings.plugins.usb_keyboard)

      self.activeProfileName = self.settingsViewModel.settings.plugins.usb_keyboard.active_profile;
      self.profiles = self.settingsViewModel.settings.plugins.usb_keyboard.profiles
      self.devicePath = self.settingsViewModel.settings.plugins.usb_keyboard.device_path


      $( "#UsbDeviceConfigModal" ).on('hidden', self.configureDevice);
      $('#settings_plugin_usb_keyboard_link > a').on('click', function(){
        console.log("Turning on listening...")
        OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"start"});
      });
    }

    self.onSettingsShown = function() {
      // console.log("Turning on listening...")
      // OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"start"});
    }

    self.onSettingsBeforeSave = function() {
      // console.log("Settings saving", self.settingsViewModel.settings.plugins.usb_keyboard)

      console.log("Turning off listening... 1")
      OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"stop"});

      // TODO: remove duplicate profile names
      // self.settingsViewModel.settings.plugins.usb_keyboard.profiles = self.profiles;
    }


    self.onSettingsHidden = function() {
      // console.log("Settings closed", self.settingsViewModel.settings.plugins.usb_keyboard)

      console.log("Turning off listening... 2")
      OctoPrint.simpleApiCommand('usb_keyboard', 'active_listening', {"action":"stop"});


      $('#settings_plugin_usb_keyboard button.fa-unlock').trigger('click');     // Lock all locks
      $('#settings_plugin_usb_keyboard button.fa-caret-down').trigger('click'); // Contract all expansions
      $('#settings_plugin_usb_keyboard button.fa-info-circle').trigger('click'); // Hide all info
    }

    // Key Discovery coming back
    self.onDataUpdaterPluginMessage = function (plugin, data) {
      if (plugin !== "usb_keyboard") {
        return;
      }

      switch(data["reply"]) {
        case "key_discovery":


          // var row = data["row"]
          // var column = data["column"]
          var keyName = data["name"]
          // var profile = data["profile"]
          //
          // var targetedProfileIndex = 0

          // function findTargetedProfile(value, index, array) {
//             if (value.key() == profile) {
//               targetedProfileIndex = index;
//             }
//           }
//           self.profiles().forEach(findTargetedProfile);

          // self.profiles().some(function(value) {
          //   if (value.key() == profile) {
          //     console.log("Key targeted ", self.profiles()[targetedProfileIndex].value.keyboard.board()[row].keys()[column]);
          //     value.value.keyboard.board()[row].keys.splice(column, 1, keyName)
          //     return true
          //   }})

          // console.log("Key targeted ", self.profiles()[targetedProfileIndex].value.keyboard()[row].keys()[column]);
//
//           self.profiles()[targetedProfileIndex].value.keyboard()[row].keys.splice(column, 1, keyName)
          function setKeys(value, index, array) {
            value.setKey(keyName)
          }

          self.keyDiscovery.forEach(setKeys);
          self.keyDiscovery = []

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


