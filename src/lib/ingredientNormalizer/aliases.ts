// Ingredient aliases - maps variations to canonical form
// This handles synonyms, brand names, and common variations

export const INGREDIENT_ALIASES: Record<string, string> = {
  // Starches
  'cornflour': 'cornstarch',
  'corn flour': 'cornstarch',
  'corn starch': 'cornstarch',
  
  // Herbs - fresh/dried variations
  'coriander': 'cilantro',
  'fresh coriander': 'cilantro',
  'coriander leaves': 'cilantro',
  'chinese parsley': 'cilantro',
  'fresh cilantro': 'cilantro',
  'cilantro leaves': 'cilantro',
  
  'spring onion': 'green onion',
  'spring onions': 'green onion',
  'scallion': 'green onion',
  'scallions': 'green onion',
  'green onions': 'green onion',
  
  'rocket': 'arugula',
  'rocket lettuce': 'arugula',
  
  'courgette': 'zucchini',
  'courgettes': 'zucchini',
  
  'aubergine': 'eggplant',
  'aubergines': 'eggplant',
  
  'capsicum': 'bell pepper',
  'sweet pepper': 'bell pepper',
  
  // Sugars
  'caster sugar': 'sugar',
  'castor sugar': 'sugar',
  'granulated sugar': 'sugar',
  'white sugar': 'sugar',
  'superfine sugar': 'sugar',
  'regular sugar': 'sugar',
  
  'powdered sugar': 'confectioners sugar',
  'icing sugar': 'confectioners sugar',
  
  'demerara sugar': 'brown sugar',
  'muscovado sugar': 'brown sugar',
  'dark brown sugar': 'brown sugar',
  'light brown sugar': 'brown sugar',
  
  // Flours
  'all-purpose flour': 'flour',
  'all purpose flour': 'flour',
  'ap flour': 'flour',
  'plain flour': 'flour',
  'white flour': 'flour',
  'unbleached flour': 'flour',
  'bleached flour': 'flour',
  
  'wholemeal flour': 'whole wheat flour',
  'wholewheat flour': 'whole wheat flour',
  
  // Dairy
  'heavy cream': 'heavy whipping cream',
  'whipping cream': 'heavy whipping cream',
  'double cream': 'heavy whipping cream',
  'thickened cream': 'heavy whipping cream',
  
  'single cream': 'light cream',
  'pouring cream': 'light cream',
  
  'natural yogurt': 'plain yogurt',
  'natural yoghurt': 'plain yogurt',
  'plain yoghurt': 'plain yogurt',
  'greek yoghurt': 'greek yogurt',
  'low fat greek yogurt': 'greek yogurt',
  'fat free greek yogurt': 'greek yogurt',
  'nonfat greek yogurt': 'greek yogurt',
  
  'salted butter': 'butter',
  'unsalted butter': 'butter',
  'softened butter': 'butter',
  'melted butter': 'butter',
  'cold butter': 'butter',
  'room temperature butter': 'butter',
  
  // Eggs
  'large egg': 'egg',
  'large eggs': 'egg',
  'medium egg': 'egg',
  'medium eggs': 'egg',
  'eggs': 'egg',
  'whole egg': 'egg',
  'whole eggs': 'egg',
  'free range egg': 'egg',
  'free range eggs': 'egg',
  
  // Cheese
  'parmesan cheese': 'parmesan',
  'parmigiano reggiano': 'parmesan',
  'parmigiano-reggiano': 'parmesan',
  'grated parmesan': 'parmesan',
  'shredded parmesan': 'parmesan',
  'pecorino romano': 'pecorino',
  
  'cheddar cheese': 'cheddar',
  'sharp cheddar': 'cheddar',
  'mild cheddar': 'cheddar',
  'shredded cheddar': 'cheddar',
  'grated cheddar': 'cheddar',
  
  'mozzarella cheese': 'mozzarella',
  'fresh mozzarella': 'mozzarella',
  'shredded mozzarella': 'mozzarella',
  
  'cream cheese': 'cream cheese',
  'philadelphia': 'cream cheese',
  
  // Milk
  'whole milk': 'milk',
  'full fat milk': 'milk',
  '2% milk': 'milk',
  'reduced fat milk': 'milk',
  'skim milk': 'milk',
  'skimmed milk': 'milk',
  'low fat milk': 'milk',
  'fat free milk': 'milk',
  'semi-skimmed milk': 'milk',
  
  // Oils
  'extra virgin olive oil': 'olive oil',
  'extra-virgin olive oil': 'olive oil',
  'evoo': 'olive oil',
  'light olive oil': 'olive oil',
  
  'vegetable oil': 'neutral oil',
  'canola oil': 'neutral oil',
  'rapeseed oil': 'neutral oil',
  'sunflower oil': 'neutral oil',
  'corn oil': 'neutral oil',
  
  // Vinegars
  'white wine vinegar': 'white wine vinegar',
  'red wine vinegar': 'red wine vinegar',
  'balsamic vinegar': 'balsamic vinegar',
  'aged balsamic': 'balsamic vinegar',
  'apple cider vinegar': 'apple cider vinegar',
  'cider vinegar': 'apple cider vinegar',
  'rice vinegar': 'rice vinegar',
  'rice wine vinegar': 'rice vinegar',
  
  // Broths/Stocks
  'chicken broth': 'chicken stock',
  'chicken stock': 'chicken stock',
  'low sodium chicken broth': 'chicken stock',
  'low-sodium chicken broth': 'chicken stock',
  
  'beef broth': 'beef stock',
  'beef stock': 'beef stock',
  'low sodium beef broth': 'beef stock',
  
  'vegetable broth': 'vegetable stock',
  'vegetable stock': 'vegetable stock',
  'veggie broth': 'vegetable stock',
  
  // Tomatoes
  'canned tomatoes': 'canned tomatoes',
  'tinned tomatoes': 'canned tomatoes',
  'canned chopped tomatoes': 'canned tomatoes',
  'canned diced tomatoes': 'canned tomatoes',
  'diced tomatoes': 'canned tomatoes',
  'chopped tomatoes': 'canned tomatoes',
  'crushed tomatoes': 'canned tomatoes',
  'canned crushed tomatoes': 'canned tomatoes',
  'canned peeled tomatoes': 'canned tomatoes',
  'whole peeled tomatoes': 'canned tomatoes',
  'whole tomatoes': 'canned tomatoes',
  'san marzano tomatoes': 'canned tomatoes',
  'plum tomatoes': 'canned tomatoes',
  
  'tomato paste': 'tomato paste',
  'tomato puree': 'tomato paste',
  'tomato concentrate': 'tomato paste',
  'double concentrate tomato': 'tomato paste',
  
  // Seasonings
  'kosher salt': 'salt',
  'sea salt': 'salt',
  'table salt': 'salt',
  'fine salt': 'salt',
  'coarse salt': 'salt',
  'flaky salt': 'salt',
  'maldon salt': 'salt',
  
  'black pepper': 'pepper',
  'ground black pepper': 'pepper',
  'freshly ground black pepper': 'pepper',
  'ground pepper': 'pepper',
  'cracked black pepper': 'pepper',
  'freshly cracked pepper': 'pepper',
  
  'salt and pepper': 'salt',
  'salt & pepper': 'salt',
  's&p': 'salt',
  
  // Garlic
  'garlic cloves': 'garlic',
  'garlic clove': 'garlic',
  'cloves garlic': 'garlic',
  'clove garlic': 'garlic',
  'minced garlic': 'garlic',
  'fresh garlic': 'garlic',
  'crushed garlic': 'garlic',
  
  // Onions
  'onions': 'onion',
  'yellow onion': 'onion',
  'yellow onions': 'onion',
  'white onion': 'onion',
  'white onions': 'onion',
  'brown onion': 'onion',
  'brown onions': 'onion',
  'sweet onion': 'onion',
  'vidalia onion': 'onion',
  
  'red onion': 'red onion',
  'red onions': 'red onion',
  'purple onion': 'red onion',
  
  // Common vegetables
  'tomatoes': 'tomato',
  'fresh tomatoes': 'tomato',
  'ripe tomatoes': 'tomato',
  'roma tomatoes': 'tomato',
  'roma tomato': 'tomato',
  'vine tomatoes': 'tomato',
  'beefsteak tomato': 'tomato',
  
  'potatoes': 'potato',
  'russet potatoes': 'potato',
  'russet potato': 'potato',
  'baking potatoes': 'potato',
  'baking potato': 'potato',
  'white potatoes': 'potato',
  
  'yukon gold potatoes': 'yukon gold potato',
  'yukon gold': 'yukon gold potato',
  'gold potatoes': 'yukon gold potato',
  
  'carrots': 'carrot',
  'large carrots': 'carrot',
  'medium carrots': 'carrot',
  
  'celery stalks': 'celery',
  'celery stalk': 'celery',
  'stalks celery': 'celery',
  'ribs celery': 'celery',
  'celery ribs': 'celery',
  
  // Peppers
  'bell pepper': 'bell pepper',
  'bell peppers': 'bell pepper',
  'red bell pepper': 'red bell pepper',
  'red bell peppers': 'red bell pepper',
  'red pepper': 'red bell pepper',
  'green bell pepper': 'green bell pepper',
  'green bell peppers': 'green bell pepper',
  'green pepper': 'green bell pepper',
  'yellow bell pepper': 'yellow bell pepper',
  'orange bell pepper': 'orange bell pepper',
  
  // Citrus
  'lemons': 'lemon',
  'fresh lemon': 'lemon',
  'limes': 'lime',
  'fresh lime': 'lime',
  
  'lemon juice': 'lemon juice',
  'fresh lemon juice': 'lemon juice',
  'lime juice': 'lime juice',
  'fresh lime juice': 'lime juice',
  
  'lemon zest': 'lemon zest',
  'zest of lemon': 'lemon zest',
  'lime zest': 'lime zest',
  'zest of lime': 'lime zest',
  
  // Herbs (fresh/dried treated same for shopping)
  'fresh parsley': 'parsley',
  'flat leaf parsley': 'parsley',
  'flat-leaf parsley': 'parsley',
  'italian parsley': 'parsley',
  'curly parsley': 'parsley',
  'chopped parsley': 'parsley',
  
  'fresh basil': 'basil',
  'basil leaves': 'basil',
  'fresh basil leaves': 'basil',
  'thai basil': 'thai basil',
  
  'fresh thyme': 'thyme',
  'thyme leaves': 'thyme',
  'thyme sprigs': 'thyme',
  
  'fresh rosemary': 'rosemary',
  'rosemary leaves': 'rosemary',
  'rosemary sprigs': 'rosemary',
  
  'fresh oregano': 'oregano',
  'dried oregano': 'oregano',
  
  'fresh dill': 'dill',
  'dill weed': 'dill',
  
  'fresh mint': 'mint',
  'mint leaves': 'mint',
  'fresh mint leaves': 'mint',
  
  // Proteins
  'chicken breasts': 'chicken breast',
  'boneless chicken breasts': 'chicken breast',
  'boneless skinless chicken breasts': 'chicken breast',
  'boneless, skinless chicken breasts': 'chicken breast',
  'skinless chicken breast': 'chicken breast',
  
  'chicken thighs': 'chicken thigh',
  'boneless chicken thighs': 'chicken thigh',
  'boneless skinless chicken thighs': 'chicken thigh',
  'skinless chicken thighs': 'chicken thigh',
  
  'ground beef': 'ground beef',
  'minced beef': 'ground beef',
  'beef mince': 'ground beef',
  'lean ground beef': 'ground beef',
  '80/20 ground beef': 'ground beef',
  '85/15 ground beef': 'ground beef',
  
  'ground pork': 'ground pork',
  'pork mince': 'ground pork',
  'minced pork': 'ground pork',
  
  'ground turkey': 'ground turkey',
  'turkey mince': 'ground turkey',
  'minced turkey': 'ground turkey',
  
  'bacon strips': 'bacon',
  'bacon slices': 'bacon',
  'streaky bacon': 'bacon',
  'rashers bacon': 'bacon',
  
  // Pasta
  'spaghetti pasta': 'spaghetti',
  'spaghetti noodles': 'spaghetti',
  'penne pasta': 'penne',
  'penne rigate': 'penne',
  'rigatoni pasta': 'rigatoni',
  'fettuccine pasta': 'fettuccine',
  'fettuccine noodles': 'fettuccine',
  'linguine pasta': 'linguine',
  'farfalle pasta': 'farfalle',
  'bow tie pasta': 'farfalle',
  
  // Rice
  'white rice': 'rice',
  'long grain rice': 'rice',
  'long-grain rice': 'rice',
  'long grain white rice': 'rice',
  'short grain rice': 'rice',
  'medium grain rice': 'rice',
  
  'jasmine rice': 'jasmine rice',
  'thai jasmine rice': 'jasmine rice',
  
  'basmati rice': 'basmati rice',
  'white basmati': 'basmati rice',
  'aged basmati': 'basmati rice',
  
  // Breads
  'bread crumbs': 'breadcrumbs',
  'dried breadcrumbs': 'breadcrumbs',
  'plain breadcrumbs': 'breadcrumbs',
  'italian breadcrumbs': 'breadcrumbs',
  
  'panko bread crumbs': 'panko',
  'panko breadcrumbs': 'panko',
  'japanese breadcrumbs': 'panko',
  
  // Soy products
  'soy sauce': 'soy sauce',
  'light soy sauce': 'soy sauce',
  'dark soy sauce': 'dark soy sauce',
  'low sodium soy sauce': 'soy sauce',
  'reduced sodium soy sauce': 'soy sauce',
  'tamari': 'soy sauce',
  'shoyu': 'soy sauce',
  
  // Asian ingredients
  'sesame oil': 'sesame oil',
  'toasted sesame oil': 'sesame oil',
  'dark sesame oil': 'sesame oil',
  
  'fish sauce': 'fish sauce',
  'thai fish sauce': 'fish sauce',
  'nam pla': 'fish sauce',
  
  'oyster sauce': 'oyster sauce',
  
  'hoisin sauce': 'hoisin sauce',
  'hoisin': 'hoisin sauce',
  
  'coconut milk': 'coconut milk',
  'full fat coconut milk': 'coconut milk',
  'light coconut milk': 'coconut milk',
  'coconut cream': 'coconut cream',
  
  // Baking
  'baking powder': 'baking powder',
  'baking soda': 'baking soda',
  'bicarbonate of soda': 'baking soda',
  'bicarb soda': 'baking soda',
  
  'vanilla extract': 'vanilla extract',
  'pure vanilla extract': 'vanilla extract',
  'vanilla essence': 'vanilla extract',
  
  'active dry yeast': 'yeast',
  'instant yeast': 'yeast',
  'dry yeast': 'yeast',
  'rapid rise yeast': 'yeast',
  
  // Nuts
  'almonds': 'almond',
  'whole almonds': 'almond',
  'sliced almonds': 'sliced almond',
  'slivered almonds': 'sliced almond',
  
  'walnuts': 'walnut',
  'walnut halves': 'walnut',
  'chopped walnuts': 'walnut',
  
  'pecans': 'pecan',
  'pecan halves': 'pecan',
  'chopped pecans': 'pecan',
  
  'peanuts': 'peanut',
  'roasted peanuts': 'peanut',
  'unsalted peanuts': 'peanut',
  
  'cashews': 'cashew',
  'cashew nuts': 'cashew',
  'raw cashews': 'cashew',
  'roasted cashews': 'cashew',
  
  'pine nuts': 'pine nut',
  'pignoli': 'pine nut',
  'pinoli': 'pine nut',
};

// Words to strip from ingredient names (don't affect shopping)
export const DESCRIPTORS_TO_REMOVE = [
  'fresh',
  'freshly',
  'dried',
  'ground',
  'minced',
  'chopped',
  'diced',
  'sliced',
  'cubed',
  'julienned',
  'shredded',
  'grated',
  'crushed',
  'mashed',
  'pureed',
  'melted',
  'softened',
  'room temperature',
  'cold',
  'warm',
  'hot',
  'frozen',
  'thawed',
  'cooked',
  'raw',
  'ripe',
  'unripe',
  'peeled',
  'unpeeled',
  'seeded',
  'seedless',
  'deseeded',
  'cored',
  'trimmed',
  'cleaned',
  'washed',
  'rinsed',
  'drained',
  'packed',
  'loosely packed',
  'firmly packed',
  'lightly packed',
  'tightly packed',
  'divided',
  'separated',
  'beaten',
  'whisked',
  'sifted',
  'toasted',
  'roasted',
  'blanched',
  'optional',
  'to taste',
  'as needed',
  'for serving',
  'for garnish',
  'for topping',
  'of choice',
  'your choice',
  'approximately',
  'about',
  'roughly',
  'finely',
  'coarsely',
  'thinly',
  'thickly',
  'medium',
  'small',
  'large',
  'extra large',
  'jumbo',
  'organic',
  'natural',
  'pure',
  'quality',
  'good quality',
  'high quality',
  'best quality',
  'homemade',
  'store bought',
  'store-bought',
  'prepared',
  'ready made',
  'pre-made',
  'plus more',
  'plus extra',
  'heaping',
  'heaped',
  'level',
  'rounded',
  'scant',
  'generous',
];
