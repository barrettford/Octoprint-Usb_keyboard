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
    
    
    
    
    function KeyboardViewModel(params) {
      var self = this;
      // console.log("Keyboard View Model raw", params)
      // console.log("Keyboard View Model self", self)

      self.keyboard = params.keyboard
      self.profile = params.profile

      self.keyboardSizeLocked = ko.observable(true);
      self.keyboardScaleMultiplier = ko.observable();

      self.toggleKeyboardSizeLock = function() {
        self.keyboardSizeLocked(!self.keyboardSizeLocked());
        console.log("Toggling keyboard size lock to " + (self.keyboardSizeLocked() ? 'locked' : 'unlocked'))
      }

      self.keyboardSizeLockedClass = ko.pureComputed(function() {
        return self.keyboardSizeLocked() ? 'fa fa-lock' : 'fa fa-unlock';
      }).extend({ notify: 'always' });

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
      self.row = params.row()
      self.keyboardSizeLocked = params.keyboardSizeLocked
      
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
      self.column = params.column()
      
      
      self.configureKey = function() {
        console.log("Key '" + self.text() + "' pressed, [" + self.row + "][" + self.column + "] profile = " + self.profile)
      
        // TODO:  DON'T LOSE THIS
        OctoPrint.simpleApiCommand('usb_keyboard', 'key_discovery', {"row":self.row, "column":self.column, "profile":self.profile});

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
      console.log("VariablesViewModel raw", params)
      console.log("VariablesViewModel self", self)
      
      // self.variables = ko.observable(params.variables)
      self.variables = params.variables
      
      self.variablesLocked = ko.observable(true);
      
      self.toggleVariablesLock = function() {
        self.variablesLocked(!self.variablesLocked());
        console.log("Toggling variables lock to " + (self.variablesLocked() ? 'locked' : 'unlocked'))
      }

      self.variablesLockedClass = ko.pureComputed(function() {
        return self.variablesLocked() ? 'fa fa-lock' : 'fa fa-unlock';
      }).extend({ notify: 'always' });
      
      this.deleteVariable = function(variable) {
        console.log("before deleting variables", self.variables)
        var variables = self.variables
        delete variables[variable.key]
        
        
        self.variables = variables
        // delete self.variables()[variable.key]
        // self.variables.valueHasMutated()
        console.log("after deleting variables", self.variables)
      }

      this.addVariable = function() {
        console.log("before adding variables", self.variables())

        var variables = self.variables
        variables[self.newVariableKey()] = self.newVariableValue()

        self.newVariableKey(null)
        self.newVariableValue(null)
        self.variables(variables)

        // delete self.variables()[variable.key]
        // self.variables.valueHasMutated()
        console.log("after adding variables", self.variables())
      }
    }
    
    ko.components.register('sfr-variables', {
      viewModel: VariablesViewModel,
      template: { element: 'template-sfr-variables' }
    });
    
    // self.profileNames = ko.computed(function() {
//       return Object.keys(self.profiles())
//     }).extend({ notify: 'always' });
    
    
    
    

    self.onBeforeBinding = function() {
      console.log("Settings", self.settingsViewModel.settings.plugins.usb_keyboard)
      
      
      self.activeProfileName = self.settingsViewModel.settings.plugins.usb_keyboard.active_profile;
      self.profiles = self.settingsViewModel.settings.plugins.usb_keyboard.profiles
      
      // self.profiles(self.settingsViewModel.settings.plugins.usb_keyboard.profiles)
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
      // console.log("self.profiles()", self.profiles());
      
      console.log("Key targetted ", self.profiles[data["profile"]].keyboard()[data["row"]].keys()[data["column"]] );
      
      
      // self.profiles[data["profile"]].keyboard()[data["row"]].keys().splice(data["column"], 1, data["name"]);
      // self.profiles[data["profile"]].keyboard()[data["row"]].keys.valueHasMutated();
    }
    
    ko.bindingHandlers['keyvalue'] = {
      makeTemplateValueAccessor: function(valueAccessor) {
          return function() {
              console.log("keyvalue valueAccessor wrapped", valueAccessor())
              console.log("keyvalue valueAccessor unwrapped", ko.unwrap(valueAccessor()))
            
              // var values = ko.unwrap(valueAccessor());
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
    
    var templateFromUrlLoader = {
      loadTemplate: function(name, templateConfig, callback) {
        if (templateConfig.fromUrl) {
          // Uses jQuery's ajax facility to load the markup from a file
          var fullUrl = '/plugins/usb_keyboard/static/js/templates/' + templateConfig.fromUrl + '?cacheAge=' + templateConfig.maxCacheAge;
          $.get(fullUrl, function(markupString) {
              // We need an array of DOM nodes, not a string.
              // We can use the default loader to convert to the
              // required format.
              ko.components.defaultLoader.loadTemplate(name, markupString, callback);
          });
        } else {
          // Unrecognized config format. Let another loader handle it.
          callback(null);
        }
      }
    };
 
    // Register it
    ko.components.loaders.unshift(templateFromUrlLoader);
    
    var viewModelCustomLoader = {
      loadViewModel: function(name, viewModelConfig, callback) {
        if (viewModelConfig.viaLoader) {
          // You could use arbitrary logic, e.g., a third-party
          // code loader, to asynchronously supply the constructor.
          // For this example, just use a hard-coded constructor function.
          var viewModelConstructor = function(params) {
            console.log("Via Loader Params", params)
              this.prop1 = 123;
          };
 
          // We need a createViewModel function, not a plain constructor.
          // We can use the default loader to convert to the
          // required format.
          ko.components.defaultLoader.loadViewModel(name, viewModelConstructor, callback);
        } else {
          // Unrecognized config format. Let another loader handle it.
          callback(null);
        }
      }
    };
 
    // Register it
    ko.components.loaders.unshift(viewModelCustomLoader);
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


