/*var nodeUtil = require("util"),
            fs = require('fs'),
            _ = require('underscore'),
            PDFParser = require("pdf2json/pdfparser");

var ben = function(stuff){

    console.log(stuff.data);

    if(stuff.data.Pages){
        for (var i = 0; i < stuff.data.Pages.length; i++) {
            var page = stuff.data.Pages[i];

            for (var j = 0; j < page.Texts.length; j++) {
                var text = page.Texts[j];

                for (var k = 0; k < text.R.length; k++) {
                    var something = text.R[k];

                    console.log(decodeURIComponent(something.T));
                };
            };
        };
    }
}

        var pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataReady", _.bind(ben, pdfParser));

        pdfParser.on("pdfParser_dataError", _.bind(ben, pdfParser));

        var pdfFilePath = "burger2.pdf";

        pdfParser.loadPDF(pdfFilePath);*/

var foodstuff = require('./foodstuff');

foodstuff.parsePDF('burger.pdf');
