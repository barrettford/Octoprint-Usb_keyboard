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
