/*
 * View model for OctoPrint-Usb_keyboard
 *
 * Author: Barrett Ford
 * License: AGPLv3
 */


$(function() {
  function Usb_keyboardViewModel(parameters) {
    var self = this;    

    // assign the injected parameters, e.g.:
    // self.loginStateViewModel = parameters[0];
    // self.settingsViewModel = parameters[1];
    
    self.settingsViewModel = parameters[0];
    self.activeProfileName = ko.observable();
    
    function Lockable(description) {
      var self = this
      
      self.locked = ko.observable(true);
      self.description = description
      
      self.toggleLock = function() {
        self.locked(!self.locked());
        console.log("Toggling " + description + " lock to " + (self.locked() ? 'locked' : 'unlocked'))
      }
      
      self.lockedClass = ko.pureComputed(function() {
        return self.locked() ? 'fa fa-lock' : 'fa fa-unlock';
      });// .extend({ notify: 'always' });
    }
    
    function KeyboardViewModel(params) {
      var self = this;
      Lockable.call(self, "keyboard")
      
      // console.log("Keyboard View Model raw", params)
      // console.log("Keyboard View Model self", self)

      self.keyboard = params.keyboard
      self.profile = params.profile

      self.keyboardScaleMultiplier = ko.observable();

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
      Lockable.call(self, "variables")

      // console.log("VariablesViewModel raw", params)
      // console.log("VariablesViewModel self", self)
      
      self.newVariableKey = ko.observable(null)
      self.newVariableValue = ko.observable(null)
      self.dupeDetected = ko.observable(false)
      self.variables = params.variables
      
      this.deleteVariable = function(variable, index) {
        console.log("before deleting variables", self.variables())
        self.variables.splice(index, 1)

        console.log("after deleting variables", self.variables())
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
                  "keyboard":[
                    {"keys":[null]}
                  ],
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
    

    self.onBeforeBinding = function() {
      console.log("Settings", self.settingsViewModel.settings.plugins.usb_keyboard)
      
      self.activeProfileName = self.settingsViewModel.settings.plugins.usb_keyboard.active_profile;
      self.profiles = self.settingsViewModel.settings.plugins.usb_keyboard.profiles
      
      // self.profiles(self.settingsViewModel.settings.plugins.usb_keyboard.profiles)
    }
    
    self.onSettingsBeforeSave = function() {
      console.log("Settings saving", self.settingsViewModel.settings.plugins.usb_keyboard)
      
      
      // TODO: remove duplicate profile names
      // self.settingsViewModel.settings.plugins.usb_keyboard.profiles = self.profiles;
    }
    
    self.onSettingsHidden = function() {
      console.log("Settings closed", self.settingsViewModel.settings.plugins.usb_keyboard)
      
      $('#settings_plugin_usb_keyboard button.fa-unlock').trigger('click');
    }
    
    // Key Discovery coming back
    self.onDataUpdaterPluginMessage = function (plugin, data) {
      if (plugin !== "usb_keyboard") {
        return;
      }
      // console.log("Data", plugin, data);
      // TODO:  Fix this!
      
      var row = data["row"]
      var column = data["column"]
      var keyName = data["name"]
      var profile = data["profile"]
      
      // console.log("self.profiles()", self.profiles());
      // console.log("self.profiles()", self.profiles());
      // console.log("self.profiles()", self.profiles()[data["profile"]].value.keyboard()[data["row"]].keys()[data["column"]] );
      
      var targetedProfileIndex = 0
            
      function findTargetedProfile(value, index, array) {
        if (value.key() == profile) {
          targetedProfileIndex = index;
        }
      }
      self.profiles().forEach(findTargetedProfile);
      
      console.log("Key targeted ", self.profiles()[targetedProfileIndex].value.keyboard()[row].keys()[column]);
      
      self.profiles()[targetedProfileIndex].value.keyboard()[row].keys.splice(column, 1, keyName)
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


