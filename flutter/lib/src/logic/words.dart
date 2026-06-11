import 'dart:math';

/// Word bank ported verbatim from `src/providers/words/words.ts`.
class Words {
  Words({Random? random}) : _random = random ?? Random();

  final Random _random;

  static const List<String> easyWords = [
    'a cat', 'the sun', 'a cup', 'a ghost', 'a flower', 'a pie', 'a cow',
    'a banana', 'a snowflake', 'a bug', 'a book', 'a jar', 'a snake', 'light',
    'a tree', 'lips', 'an apple', 'a slide', 'socks', 'a smile', 'a swing',
    'a coat', 'a shoe', 'water', 'a heart', 'a hat', 'the ocean', 'a kite',
    'a dog', 'a mouth', 'milk', 'a duck', 'eyes', 'a skateboard', 'a bird',
    'a boy', 'an apple', 'a person', 'a girl', 'a mouse', 'a ball', 'a house',
    'a star', 'a nose', 'a bed', 'a whale', 'a jacket', 'a shirt', 'a hippo',
    'a beach', 'an egg', 'a face', 'a cookie', 'cheese', 'an ice cream cone',
    'a drum', 'a circle', 'a spoon', 'a worm', 'a spider web', 'a bridge',
    'a bone', 'grapes', 'a bell', 'a jellyfish', 'a bunny', 'a truck',
    'a grass', 'a door', 'a monkey', 'a spider', 'bread', 'ears', 'a bowl',
    'a bracelet', 'an alligator', 'a bat', 'a clock', 'a lollipop', 'the moon',
    'a doll', 'an orange', 'an ear', 'a basketball', 'a bike', 'an airplane',
    'a pen', 'an inchworm', 'a seashell', 'a rocket', 'a cloud', 'a bear',
    'corn', 'a chicken', 'a purse', 'glasses', 'blocks', 'a carrot',
    'a turtle', 'a pencil', 'a horse', 'a dinosaur', 'a head', 'a lamp',
    'a snowman', 'an ant', 'a giraffe', 'a cupcake', 'a chair', 'a leaf',
    'a bunk', 'a bed', 'a snail', 'a baby', 'a balloon', 'a bus', 'a cherry',
    'a crab', 'football', 'a branch', 'a robot',
  ];

  /// Returns a pseudo-random word. Mirrors the original mixing of the clock and
  /// a random offset (`game-model` calls this once per thread).
  String getWord() {
    final index = _random.nextInt(easyWords.length);
    return easyWords[index];
  }
}
