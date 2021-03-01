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
