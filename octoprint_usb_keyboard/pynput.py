pynput import keyboard

# If trying to use pynput
def on_key(key, key_state, key_dict = key_dict):
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
  
  
  
  
  
  
  if key_dict.get(key_string) == key_state:
    return
  else:
    key_dict[key_string] = key_state
    eventManager().fire("plugin_usb_keyboard_key_event", dict(key=key_string, key_state=key_state))
    # eventManager().fire("SomeOtherUSBEvent", dict(key=key_string, key_state=key_state))


def on_press(key):  # The function that's called when a key is pressed
  # print(f"key [{key_string}] pressed")
  on_key(key, "pressed")
  
  
  
  # eventManager().fire("Usb_keyboard_key_event", dict(key=key, action="pressed"))
  # print("Key pressed: {0}".format(key))

def on_release(key):  # The function that's called when a key is released
  on_key(key, "released")
  # eventManager().fire("Usb_keyboard_key_event", dict(key=key, action="released"))
  # print("Key released: {0}".format(key))