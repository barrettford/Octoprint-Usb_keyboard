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
    console.log("Settings ", self.settingsViewModel)
    
    
    self.activeProfileName = ko.observable();
    self.profiles = ko.observable();
    
    
    self.activeProfileData = ko.observable();
    self.activeProfileView = ko.observable();
    
    self.editingProfileName = ko.observable(null);
    self.editingProfileProfile = ko.observable();
    
    self.profilesLocked = ko.observable(true);
    self.profileList = ko.observableArray();
    // self.keyDiscovery = ko.observable(false);
    


    // self.configureKey = function(data, row, key, event) {
//       // TODO:  DON'T LOSE THIS
//       // OctoPrint.simpleApiCommand('usb_keyboard', 'key_discovery', {"row":row, "key":key});
//
//       // self.keyDetectionBinding(null)
//       // self.settings.settings.plugins.usb_keyboard.key_discovery(null)
//       // self.settingsViewModel.saveData({plugins: {usb_keyboard: {key_discovery: {"row":row,"key":key}}}})
//       // self.keyDetectionBinding(self.settings.settings.plugins.usb_keyboard.key_discovery())
//       // console.log("self.keyDetectionBinding() ", self.keyDetectionBinding())
//       console.log("self.settings() ", self.settingsViewModel.settings.plugins.usb_keyboard.key_discovery)
//     };
   //
   //
   //
   //  keysViewModel = function(keys) {
   //    var self = this;
   //
   //
   //    self.keys = ko.observableArray(keys);
   //
   //    this.addKey = function() {
   //      console.log("Clicked + key");
   //      self.keys.push(null)
   //    };
   //
   //    // this will be called when the user clicks the "+ Column" button and add a new column of data
   //    this.deleteKey = function() {
   //      console.log("Clicked - key");
   //      // TODO:  Put an "Are you sure?" dialog if the cell has config
   //      self.keys.pop()
   //    };
   //  }
   //
   //
   //  keyboardViewModel = function(keyboard) {
   //    var self = this;
   //
   //    self.rows = ko.observableArray();
   //    self.keyboardSizeLocked = ko.observable(true);
   //    self.keyboardScaleMultiplier = ko.observable();
   //
   //
   //
   //    self.toggleKeyboardSizeLock = function() {
   //      self.keyboardSizeLocked(!self.keyboardSizeLocked());
   //      console.log("Toggling keyboard size lock to " + (self.keyboardSizeLocked() ? 'locked' : 'unlocked'))
   //    }
   //
   //    self.keyboardSizeLockedClass = ko.pureComputed(function() {
   //      return self.keyboardSizeLocked() ? 'fa fa-lock' : 'fa fa-unlock';
   //    }).extend({ notify: 'always' });
   //
   //    // this will be called when the user clicks the "+ Row" button and add a new row of data
   //    self.addRow = function() {
   //      console.log("Clicked + row");
   //      self.rows.push(new keysViewModel([null]))
   //    };
   //
   //    // this will be called when the user clicks the "+ Row" button and add a new row of data
   //    this.deleteRow = function() {
   //      console.log("Clicked - row");
   //      // TODO:  Put an "Are you sure?" dialog if the cell has config
   //      self.rows.pop()
   //    };
   //
   //    keyboard.rows().forEach(function (row) {
   //      self.rows.push(new keysViewModel(row.keys()));
   //    });
   //  }
   //
   //
   //  variablesViewModel = function(variables) {
   //    var self = this;
   //
   //    self.variables = ko.observable(variables)
   //
   //    self.newVariableKey = ko.observable()
   //    self.newVariableValue = ko.observable()
   //    self.variablesLocked = ko.observable(true);
   //    self.toggleVariablesLock = function() {
   //      self.variablesLocked(!self.variablesLocked());
   //      console.log("Toggling variables lock to " + (self.variablesLocked() ? 'locked' : 'unlocked'))
   //    }
   //
   //    self.variablesLockedClass = ko.pureComputed(function() {
   //      return self.variablesLocked() ? 'fa fa-lock' : 'fa fa-unlock';
   //    }).extend({ notify: 'always' });
   //
   //    this.deleteVariable = function(variable, data, event) {
   //      console.log("before deleting variables", self.variables())
   //      var variables = self.variables()
   //      delete variables[variable.key]
   //      self.variables(variables)
   //      // delete self.variables()[variable.key]
   //      console.log("after deleting variables", self.variables())
   //    }
   //
   //    this.addVariable = function() {
   //      console.log("before adding variables", self.variables())
   //
   //      var variables = self.variables()
   //      variables[self.newVariableKey()] = self.newVariableValue()
   //
   //      self.newVariableKey(null)
   //      self.newVariableValue(null)
   //      self.variables(variables)
   //
   //      // delete self.variables()[variable.key]
   //      // self.variables.valueHasMutated()
   //      console.log("after adding variables", self.variables())
   //    }
   //  }
    
    
//     profileViewModel = function(profile) {
//       var self = this;
//
//       // self.commands = ko.observable(profile.commands());
//       self.keyboard = ko.observable(new keyboardViewModel(profile["keyboard"]));
//       // var variableViewModel = ko.mapping.fromJS(profile["variables"])
//       self.variables = ko.observable(new variablesViewModel(profile["variables"]));
//       // console.log("variables", self.variables())
//       // var variableViewModel = ko.mapping.fromJS(profile["variables"])
// //       self.variables = ko.observable(variableViewModel);
//
//
// //       console.log("variables", self.variables())
//     }
    
    

    
    // self.loadProfile = function(profileName) {
    //
    //
    //
    //   return new profileViewModel(settingsViewModel.settings.plugins.usb_keyboard.profiles[profileName])
    // }
    

    
    //
    //
    // self.toggleProfilesLock = function() {
    //   self.profilesLocked(!self.profilesLocked());
    //   console.log("Toggling profile lock to " + (self.profilesLocked() ? 'locked' : 'unlocked'))
    // }
    //
    // self.profilesLockedClass = ko.pureComputed(function() {
    //   return self.profilesLocked() ? 'fa fa-lock' : 'fa fa-unlock';
    // }).extend({ notify: 'always' });
    //
    //
    // self.selectProfile = function() {
    //
    // }
    //
    
//     editProfileModal = function() {
//       var self = this;
//
//       self.newProfile = ko.observable({"commands":{}, "variables":{}, "map":[]});
//       self.newProfileName = ko.observable("");
//
//       // self.currentEmployee = ko.observable(null);
// //       self.showEmployee = function(vm){
// //           self.currentEmployee(vm);
// //           $('#myModal').modal('show');
// //       };
//       //.... // rest of your view model here
//     }

    // self.createProfile = function() {
    //   console.log("Creating new profile.")
    //   self.editingProfileProfile({"commands":{}, "variables":{}, "map":[null]});
    //   self.editingProfileName("New Profile");
    // }
    //
    // self.saveProfile = function() {
    //   console.log("Saving profile.", self.editingProfileName(), self.editingProfileProfile())
    //
    //   self.settings.saveData(
    //     {plugins: {usb_keyboard: {active_profile: self.editingProfileName(), profiles: {[self.editingProfileName()]: self.editingProfileProfile()}}}}
    //   );
    //
    //   if (self.editingProfileName() !== self.activeProfileName()) {
    //     console.log(self.editingProfileName() + " != " + self.activeProfileName())
    //
    //
    //     var name = self.editingProfileName();
    //     // var profile = self.loadProfile(name);
    //     self.activeProfileName = ko.observable(name)
    //     self.activeProfile = ko.observable(profile);
    //
    //     self.editingProfileName(null);
    //     self.editingProfileProfile(null);
    //   }
    // }
    //
    // self.duplicateProfile = function() {
    //   self.editingProfileProfile(self.activeProfileData())
    //   self.editingProfileName(self.activeProfileName())
    // }
    //
    // self.deleteProfile = function() {
    //
    // }
    
    // self.updateActiveProfileView = ko.computed(function() {
    //   console.log("Settings?", self.settings)
    //   console.log("Settings no plugins?", self.settings.settings.plugins)
    //   self.activeProfileView(new profileViewModel(self.settings, self.settings.plugins.usb_keyboard.profiles[self.activeProfileName()]));
    // }).extend({ notify: 'always' });
    //
    //
    // self.board = ko.observable();

    // This will get called before the HelloWorldViewModel gets bound to the DOM, but after its
    // dependencies have already been initialized. It is especially guaranteed that this method
    // gets called _after_ the settings have been retrieved from the OctoPrint backend and thus
    // the SettingsViewModel been properly populated.
    //
    var profilesViewModel = function(profiles) {
      ko.mapping.fromJS(profiles, {}, this);
      var self = this
      
      self.profiles = 

      console.log("Profiles View Model", this)
    }
    //
    
    self.onBeforeBinding = function() {
      console.log("Settings", self.settingsViewModel.settings.plugins.usb_keyboard)
      
      
      self.activeProfileName = self.settingsViewModel.settings.plugins.usb_keyboard.active_profile;
      console.log("Active Profile Name", self.activeProfileName());
      
      self.profiles(self.settingsViewModel.settings.plugins.usb_keyboard.profiles)
      
      
      
      // console.log("Profiles", self.settingsViewModel.settings.plugins.usb_keyboard.profiles);
      
      // self.activeProfileData(self.settingsViewModel.settings.plugins.usb_keyboard.profiles[self.activeProfileName()]);
      // // eval("self.activeProfileData(self.settingsViewModel.settings.plugins.usb_keyboard.profiles." + self.activeProfileName() + ")");
      // console.log("Active Profile Data", self.activeProfileData());
      //
      // self.activeProfileView(new profileViewModel(self.activeProfileData));
      // console.log("Active Profile View", self.activeProfileView());
      //
      // self.profileList(Object.keys(self.settingsViewModel.settings.plugins.usb_keyboard.profiles));
      // console.log("Profile List ", self.profileList());
      
      // var profiles = self.settings.settings.plugins.usb_keyboard.profiles();
      
      
      
      // var keyboard = self.settings.settings.plugins.usb_keyboard.profiles.<self.activeProfileView()?>.map();
      
      // self.board(new boardViewModel(keyboard));
      
    }
    
    self.onSettingsBeforeSave = function() {
      // self.settingsViewModel.settings.plugins.usb_keyboard.profiles[self.activeProfileName()]
      console.log("Active profile view model", self.activeProfileData())
      console.log("Settings", self.settingsViewModel.settings.plugins.usb_keyboard)
    }
    
    self.onDataUpdaterPluginMessage = function (plugin, data) {
      if (plugin !== "usb_keyboard") {
        return;
      }
      console.log("Data ", plugin, data);
      self.activeProfileView().keyboard().rows()[data["row"]].keys.splice(data["key"], 1, data["name"]);
    }
    
    // self.onEventPlugin_usb_keyboard_key_event = function(payload) {
    //   console.log("Key Pressed! ", payload)
    // }
    
    
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





<!DOCTYPE html>
   <head>
      <title>KnockoutJS textInput Binding </title>
      <script src = "https://ajax.aspnetcdn.com/ajax/knockout/knockout-3.3.0.js"
         type = "text/javascript"></script>
   </head>

   <body>
      <p> Enter your reviews here: <br><br><textarea rows=5 
      data-bind = "value: someReview" ></textarea><br></p>
      
      <p> You entered : <span data-bind = "text: someMultilineReview"></span></p>

      <script type = "text/javascript">
         function ViewModel () {
            var self = this;
            self.someMultilineReview = ko.observableArray();
            self.someReview = ko.observable('');
            
            self.combinedReview = ko.computed(function() {
                var lines = self.someReview().split('\n')
                self.someMultilineReview.removeAll()
                lines.forEach(function(entry) {
                    /* console.log("String", entry) */;
                    self.someMultilineReview.push(entry)
                });
                self.someMultilineReview.removeAll([null])
                
                
            });
            
         };

         var vm = new ViewModel();
         ko.applyBindings(vm);
      </script>
      
   </body>
</html>