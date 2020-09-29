import ctypes
import threading
from pynput import keyboard
from octoprint.events import eventManager


class KeyboardListenerThread(keyboard.Listener): 
  def __init__(self, name): 
      keyboard.Listener.__init__(self, on_press=self.on_press, on_release=self.on_release, suppress=False)
      self.name = name
      self.key_dict = {}
      
  # If trying to use pynput
  def on_key(self, key, key_state):
    try:
      # print('alphanumeric key {0} pressed'.format(key.char))
      # repr(key).len() > 2 and 
      if key and key.char and "Key." in key.char:
        key_string = key.char
      else:
        key_string = repr(key)
        if key_string:
          key_string = key_string.replace("'", "")
          key_string = key_string.replace('""', """'""")

      # key_string = key.char if "Key." in key.char else repr(key)[1:-1]
    
      # print(f"WHAT IS THIS normal '{key}' vs '{key_string}'")
    except AttributeError:
      # print('special key {0} pressed'.format(key))
      key_string =  f"{key}"
      # print(f"WHAT IS THIS special '{key}' vs '{key_string}'")
  
    key_string = key_string.replace("Key.", "")

    if self.key_dict.get(key_string) == key_state:
      return
    else:
      self.key_dict[key_string] = key_state
      # print('Fire?')
      
      eventManager().fire("plugin_usb_keyboard_key_event", dict(key=key_string, key_state=key_state))
      # eventManager().fire("SomeOtherUSBEvent", dict(key=key_string, key_state=key_state))


  def on_press(self, key):  # The function that's called when a key is pressed
    # print(f"key [{key_string}] pressed")
    self.on_key(key, "pressed")
  
  
  
    # eventManager().fire("Usb_keyboard_key_event", dict(key=key, action="pressed"))
    # print("Key pressed: {0}".format(key))

  def on_release(self, key):  # The function that's called when a key is released
    self.on_key(key, "released")
    # eventManager().fire("Usb_keyboard_key_event", dict(key=key, action="released"))
    # print("Key released: {0}".format(key))

  def get_id(self): 
    # returns id of the respective thread 
    if hasattr(self, '_thread_id'): 
      return self._thread_id 
    for id, thread in threading._active.items(): 
      if thread is self: 
        return id
  
  def stop(self): 
    thread_id = self.get_id() 
    res = ctypes.pythonapi.PyThreadState_SetAsyncExc(thread_id, 
      ctypes.py_object(SystemExit)) 
    if res > 1: 
      ctypes.pythonapi.PyThreadState_SetAsyncExc(thread_id, 0) 
      print('Exception raise failure') 


