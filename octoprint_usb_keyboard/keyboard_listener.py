# Python program raising 
# exceptions in a python 
# thread 
  
import threading
import ctypes
import time
from evdev import InputDevice, categorize, ecodes
from octoprint.events import Events, eventManager, all_events

   
class KeyboardListenerThread(threading.Thread): 
    def __init__(self, name): 
        threading.Thread.__init__(self, daemon=True)
        self.name = name 
              
    def run(self): 
        device = InputDevice('/dev/input/event1')
      
        key_dict = {}
        KEY_STATE = ["released", "pressed", "pressed"]
        try:
          for event in device.read_loop():
            if event.type == ecodes.EV_KEY:
              key_event = categorize(event)
            
              key_name = key_event.keycode
              key_name = key_name.replace("KEY_", "")
              key_state = KEY_STATE[key_event.keystate]
              if key_name not in key_dict or key_dict.get(key_name) != key_state:
                key_dict[key_name] = key_state
                eventManager().fire("plugin_usb_keyboard_key_event", dict(key=key_name, key_state=key_state))
        finally:
          # device.ungrab(
          device.close()
           
    def get_id(self): 
  
        # returns id of the respective thread 
        if hasattr(self, '_thread_id'): 
            return self._thread_id 
        for id, thread in threading._active.items(): 
            if thread is self: 
                return id
   
    def raise_exception(self): 
        thread_id = self.get_id() 
        res = ctypes.pythonapi.PyThreadState_SetAsyncExc(thread_id, 
              ctypes.py_object(SystemExit)) 
        if res > 1: 
            ctypes.pythonapi.PyThreadState_SetAsyncExc(thread_id, 0) 
            print('Exception raise failure') 