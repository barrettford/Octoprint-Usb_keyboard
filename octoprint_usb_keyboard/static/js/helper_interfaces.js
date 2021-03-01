/*
 * Helper interfaces for the Usb Keyboard view model
 *
 * Author: Barrett Ford
 * License: AGPLv3
 */

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
