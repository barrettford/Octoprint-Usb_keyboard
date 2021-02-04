##########################################################
# From https://gist.github.com/nvie/f304caf3b4f1ca4c3884 #
##########################################################
def traverse(obj, path=None, callback=None):
  """
  Traverse an arbitrary Python object structure (limited to JSON data
  types), calling a callback function for every element in the structure,
  and inserting the return value of the callback as the new value.
  """
  if path is None:
    path = []

  if isinstance(obj, dict):
    value = {k: traverse(v, path + [k], callback) for k, v in obj.items()}
  elif isinstance(obj, list):
    value = [traverse(elem, path + [[]], callback) for elem in obj]
  else:
    value = obj

  if callback is None:
    return value
  else:
    return callback(path, value)


def traverse_modify(obj, target_path, action):
  """
  Traverses an arbitrary object structure and where the path matches,
  performs the given action on the value, replacing the node with the
  action's return value.
  """
  def transformer(path, value):
    if path == target_path:
      return action(value)
    else:
      return value

  return traverse(obj, callback=transformer)
##########################################################