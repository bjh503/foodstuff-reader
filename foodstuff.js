var nodeUtil = require("util"),
    fs = require('fs'),
    _ = require('underscore'),
    PDFParser = require("pdf2json/pdfparser");

var foodstuff = {};

/**
 * Uses pdf2json to parse PDF from meallime
 */
foodstuff.parsePDF = function(pdf){

    // sort out the database
    var token = 'bab75875-5ddd-437b-aa79-30858096e226';
    this.db = require('orchestrate')(token);

    var self = this;

    this.db.ping()
    .then(function () {
        this.pdfParser = new PDFParser();
        this.pdfParser.on("pdfParser_dataReady", _.bind(self.dataReady, self));
        this.pdfParser.on("pdfParser_dataError", _.bind(self.dataError, self));
        this.pdfParser.loadPDF(pdf);
    })
    .fail(function (err) {
        console.log('Cannot connect to Orchestrate. Boo Hoo, stopping...');
        console.log(err);
    });

   /* this.pdfParser = new PDFParser();
        this.pdfParser.on("pdfParser_dataReady", _.bind(self.dataReady, self));
        this.pdfParser.on("pdfParser_dataError", _.bind(self.dataError, self));
        this.pdfParser.loadPDF(pdf);*/

}

/**
 * Read the data that has been parsed
 */
foodstuff.dataReady = function(pdf){

    var self = this;

    // Get the text and put it in an object
    var all = '';
    var words = [];

    for (var i = 0; i < pdf.data.Pages.length; i++) {
        var page = pdf.data.Pages[i];

        for (var j = 0; j < page.Texts.length; j++) {
            var text = page.Texts[j];

            for (var k = 0; k < text.R.length; k++) {
                var something = text.R[k];

                var newtext = decodeURIComponent(something.T);
                words.push(newtext);
            };
        };
    };

    // So now words contains all the text from the PDF...
    var recipe = {};
    recipe.title =  foodstuff.getTitle(words);
    recipe.date = Math.round(new Date().getTime() / 1000);
    recipe.instructions = self.getInstructions(words);    

    // Create new object and begin filling it
    
    this.db.post('recipes', recipe)
    .then(function(result){
        // Ok, now get the id from the 'Location' header
        var location = result.headers.location;
        //                     ID                  REF
        // /v0/recipes/03c083038b205b33/refs/a7b2ad7aff0d5c9b
        var id = location.slice(12, 28);

        var ingredients = self.getIngredients(words);
        var cookware = self.getCookware(words);
        var essentials = self.getEssentials(words);

        self.createAndSaveIngredients(ingredients, id);
        self.createAndSaveCookware(cookware, id);
        self.createAndSaveEssentials(essentials, id);

       
    })
    .fail(function(err){
        //not sure what to do now
    });
}

foodstuff.createEssentialLink = function(essentialId, recipeId){

    var link = {
        essential: essentialId,
        recipe: recipeId,
    };

    this.db.post('recipeEssentials', link);
}


foodstuff.createAndSaveEssentials = function(essentials, id){
    var self = this;

    // First go through and make sure each ingredient has an entry
    for (var i = essentials.length - 1; i >= 0; i--) {
        var essential = essentials[i];

        (function(essential){

            var query = 'name='+essential.name;

            // First search for it
            self.db.search('essentials', query)
            .then(function(result) {
                if(result.body.count > 0){
                    // It already exists, create link
                    var found = result.body.results[0];
                    var key = found.path.key;

                    // Create link between id and key and amount
                    foodstuff.createEssentialLink(key, id);

                } else{

                    var obj = {};
                    obj.name = essential.name;

                    // Create the ingredient, then link
                    self.db.post('essentials', obj)
                    .then(function(result){
                        // Ok, now get the id from the 'Location' header
                        var location = result.headers.location;
                        //                         ID                  REF
                        // /v0/essentials/03c083038b205b33/refs/a7b2ad7aff0d5c9b
                        var newId = location.slice(15, 31);

                        // Create link between id and key and amount
                        foodstuff.createEssentialLink(newId, id);

                    }).fail(function(err){
                        
                    });
                }
            }).fail(function(){
                // HMM
            });

        })(essential);
    };
}


foodstuff.createCookwareLink = function(wareId, recipeId){

    var link = {
        cookware: wareId,
        recipe: recipeId,
    };

    this.db.post('recipeCookware', link);
}

foodstuff.createAndSaveCookware = function(cookware, id){
    var self = this;

    // First go through and make sure each ingredient has an entry
    for (var i = cookware.length - 1; i >= 0; i--) {
        var ware = cookware[i];

        (function(ware){

            var query = 'name='+ware.name;

            // First search for it
            self.db.search('cookware', query)
            .then(function(result) {
                if(result.body.count > 0){
                    // It already exists, create link
                    var found = result.body.results[0];
                    var key = found.path.key;

                    // Create link between id and key and amount
                    foodstuff.createCookwareLink(key, id);

                } else{

                    var obj = {};
                    obj.name = ware.name;

                    // Create the ingredient, then link
                    self.db.post('cookware', obj)
                    .then(function(result){
                        // Ok, now get the id from the 'Location' header
                        var location = result.headers.location;
                        //                         ID                  REF
                        // /v0/cookware/03c083038b205b33/refs/a7b2ad7aff0d5c9b
                        var newId = location.slice(13, 29);

                        // Create link between id and key and amount
                        foodstuff.createCookwareLink(newId, id);

                    }).fail(function(err){
                        
                    });
                }
            }).fail(function(){
                // HMM
            });

        })(ware);
    };
}

foodstuff.createIngredientLink = function(ingredientId, recipeId, amount){

    var link = {
        ingredient: ingredientId,
        recipe: recipeId,
        amount: amount
    };

    this.db.post('recipeIngredients', link);
}

/**
 * First creates all ingredient objects, then saves a link between recipe and ingredient
 */
foodstuff.createAndSaveIngredients = function(ingredients, id){

    var self = this;

    // First go through and make sure each ingredient has an entry
    for (var i = ingredients.length - 1; i >= 0; i--) {
        var ingredient = ingredients[i];

        (function(ingredient){

            var query = 'name='+ingredient.name;

            // First search for it
            self.db.search('ingredients', query)
            .then(function(result) {
                if(result.body.count > 0){
                    // It already exists, create link
                    var found = result.body.results[0];
                    var key = found.path.key;

                    // Create link between id and key and amount
                    foodstuff.createIngredientLink(key, id, ingredient.amount);

                } else{

                    var obj = {};
                    obj.name = ingredient.name;

                    // Create the ingredient, then link
                    self.db.post('ingredients', obj)
                    .then(function(result){
                        // Ok, now get the id from the 'Location' header
                        var location = result.headers.location;
                        //                         ID                  REF
                        // /v0/ingredients/03c083038b205b33/refs/a7b2ad7aff0d5c9b
                        var newId = location.slice(16, 32);

                        // Create link between id and key and amount
                        foodstuff.createIngredientLink(newId, id, ingredient.amount);

                    }).fail(function(err){
                        
                    });
                }
            }).fail(function(){
                // HMM
            });

        })(ingredient);
    };
}

/**
 * Get all instructions for this recipe
 */
foodstuff.getInstructions = function(words){
    var record = false;

    var instructions = [];

    for (var i = 0; i < words.length; i++) {
        var word = words[i];

        var buf = new Buffer(word);
        // Weird character is 239 130 140
        if(buf.length == 3 && buf[0] == 239 && buf[1] == 130 && buf[2] == 140){
            break;
        }
    }
    // Now we know where to start
    var currentIndex = 0;

    var instructionWords = words.slice(i, -1);
    var order = 1;

    do{
        // First location is rubbish
        currentIndex++;

        // Read word until more rubbish
        var word = instructionWords[currentIndex];
        var buf = new Buffer(word);
        var instruction = '';
            
        while(!(buf.length == 3 && buf[0] == 239 && buf[1] == 130 && buf[2] > 140) && word != '' && currentIndex < instructionWords.length-1){           
            instruction += ' ' + word.trim() + ' ';
            currentIndex++;
            word = instructionWords[currentIndex];
            buf = new Buffer(word);
        }
        
        var newInstruction = {};
        newInstruction.instruction = instruction.trim();
        newInstruction.order = order;
        order++;

        instructions.push(newInstruction);

    } while(currentIndex < instructionWords.length -1 );

    return instructions;
}

/**
 * Get all ingredients with amounts for this recipe
 */
foodstuff.getIngredients = function(words){
    var record = false;

    var ingredients = [];

    for (var i = 0; i < words.length; i++) {
        var word = words[i];

        var buf = new Buffer(word);
        // Weird character is 239 130 140
        if(buf.length == 3 && buf[0] == 239 && buf[1] == 130 && buf[2] == 140) break;        

        if(word == 'INGREDIENTS') {
            record = true;
            continue;
        }

        if(!record) continue;

        var newIngredient = {};

        newIngredient.amount = word;
        i++;

        var word = words[i];
        if(word == '-'){
            // Something like 2 - 4 onions
            i++;
            newIngredient.amount += ' '+ word + ' ' + words[i];
            i++;
        }

        newIngredient.name = words[i];
        ingredients.push(newIngredient);
    };

    return ingredients;
}

/**
 * Get all essentials for this recipe
 */
foodstuff.getEssentials = function(words){
    var record = false;

    var essentials = [];

    for (var i = 0; i < words.length; i++) {
        var word = words[i];

        if(word == 'INGREDIENTS') break;        

        if(word == 'ESSENTIALS') {
            record = true;
            continue;
        }

        if(!record) continue;

        var newEssential = {};

        newEssential.name = word;

        essentials.push(newEssential);
    };

    return essentials;
}

/**
 * Get all cookware for this recipe
 */
foodstuff.getCookware = function(words){

    var record = false;

    var cookware = [];

    for (var i = 0; i < words.length; i++) {
        var word = words[i];

        if(word == 'ESSENTIALS') break;        

        if(word == 'COOKWARE') {
            record = true;
            continue;
        }

        if(!record) continue;

        var newCookware = {};

        newCookware.optional = word.indexOf('(optional)') > -1;
        newCookware.name = newCookware.optional ? word.slice(0, -11) : word;

        cookware.push(newCookware);
    };

    return cookware;
}

/**
 * Gets title
 */
foodstuff.getTitle = function(words){

    var title = '';

    var titleEndPattern = /[0-9] servings \| [0-9]+ minutes/;

    for (var i = 0; i < words.length; i++) {
        var word = words[i];

        if(titleEndPattern.exec(word)) break;

        title = title.trim() + ' ' + word.trim();
    };

    title = title.toLowerCase();

    return title;
}

/**
 * Handles the errors found
 */
foodstuff.dataError = function(errors){

    var error = errors.data;
    var removed = JSON.parse(JSON.stringify(error));

    delete removed.message;
    delete removed.errno;
    delete removed.code;

    var whatsleft = {};
    for(prop in removed){
        whatsleft[prop] = removed[prop];
    }

    this.db.post('errors', {
        "text": error.message,
        "errno": error.errno,
        "code": error.code,
        "extra": whatsleft
    });
}

module.exports = foodstuff;