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


