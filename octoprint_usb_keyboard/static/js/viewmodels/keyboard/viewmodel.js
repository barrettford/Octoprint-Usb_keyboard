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

  // this will be called when the user clicks the "+ Row" button and add a new row of data
  self.addRow = function() {
    self.keyboardRows.push(ko.mapping.fromJS({"keys":[{"key":null, "alias":null, "w":1, "h":1}]}))
  };

  // this will be called when the user clicks the "+ Row" button and add a new row of data
  self.deleteRow = function() {
    // TODO:  Put an "Are you sure?" dialog if the cell has config
    self.keyboardRows.pop()
  };
}
ko.components.register('sfr-keyboard', {
  viewModel: KeyboardViewModel,
  template: { element: 'template-sfr-keyboard' }
});
