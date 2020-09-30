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
    // console.log("Settings ", self.settingsViewModel)
    
    
    self.activeProfileName = ko.observable();
    self.profiles = ko.observable();
    
    // self.profileNames = ko.computed(function() {
//       return Object.keys(self.profiles())
//     }).extend({ notify: 'always' });
    
    
    self.configureKey = function(text, row, column, parent, event) {
      console.log("Key '" + text + "' pressed, [" + row + "][" + column + "] ")
      console.log("parent", parent)
      console.log("parent.$parent", parent.$parent)
      console.log("parent.$parent.key", parent.$parent.key)
      
      
      // TODO:  DON'T LOSE THIS
      OctoPrint.simpleApiCommand('usb_keyboard', 'key_discovery', {"row":row, "column":column, "profile":parent.$parent.key});

      // self.keyDetectionBinding(null)
      // self.settings.settings.plugins.usb_keyboard.key_discovery(null)
      // self.settingsViewModel.saveData({plugins: {usb_keyboard: {key_discovery: {"row":row,"key":key}}}})
      // self.keyDetectionBinding(self.settings.settings.plugins.usb_keyboard.key_discovery())
      // console.log("self.keyDetectionBinding() ", self.keyDetectionBinding())
      // console.log("self.settings() ", self.settingsViewModel.settings.plugins.usb_keyboard.key_discovery)
    };
    

    self.onBeforeBinding = function() {
      console.log("Settings", self.settingsViewModel.settings.plugins.usb_keyboard)
      
      
      self.activeProfileName = self.settingsViewModel.settings.plugins.usb_keyboard.active_profile;
      self.profiles(self.settingsViewModel.settings.plugins.usb_keyboard.profiles)
    }
    
    self.onSettingsBeforeSave = function() {
      // self.settingsViewModel.settings.plugins.usb_keyboard.profiles[self.activeProfileName()]
      console.log("Settings", self.settingsViewModel.settings.plugins.usb_keyboard)
    }
    
    self.onDataUpdaterPluginMessage = function (plugin, data) {
      if (plugin !== "usb_keyboard") {
        return;
      }
      console.log("Data ", plugin, data);
      // TODO:  Fix this!
      
      console.log("self.profiles ", self.profiles);
      console.log("self.profiles()", self.profiles());
      
      
      self.profiles()[data["profile"]].keyboard()[data["row"]].row().splice(data["column"], 1, data["name"]);
      self.profiles()[data["profile"]].keyboard()[data["row"]].row.valueHasMutated();
          
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


