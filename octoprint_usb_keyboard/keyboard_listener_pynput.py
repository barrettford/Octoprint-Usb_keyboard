import ctypes
import threading
from pynput import keyboard
from octoprint.events import eventManager


class KeyboardListenerThread(keyboard.Listener): 
  def __init__(self, name, device_path): 
      keyboard.Listener.__init__(self, on_press=self.on_press, on_release=self.on_release, suppress=False)
      self.name = name
      self.device_path = device_path
      self.key_dict = {}
      
  # If trying to use pynput
  def on_key(self, key, key_state):
    try:
      if key and key.char and "Key." in key.char:
        key_string = key.char
      else:
        key_string = repr(key)
        if key_string:
          key_string = key_string.replace("'", "")
          key_string = key_string.replace('""', """'""")
    except AttributeError:
      key_string =  f"{key}"
    key_string = key_string.replace("Key.", "")

    if self.key_dict.get(key_string) == key_state:
      return
    else:
      self.key_dict[key_string] = key_state
      eventManager().fire("plugin_usb_keyboard_key_event", dict(key=key_string, key_state=key_state))

  def on_press(self, key):  # The function that's called when a key is pressed
    self.on_key(key, "pressed")

  def on_release(self, key):  # The function that's called when a key is released
    self.on_key(key, "released")


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

  def get_device_info(self):
    return "Using pynput, no listener configuration needed.", []
