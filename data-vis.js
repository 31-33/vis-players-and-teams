//Timline demo created using vis.js - http://visjs.org/

//Configuration options for a timeline - http://visjs.org/docs/timeline.html#Configuration_Options



// DOM element where the Timeline will be attached
var container = document.getElementById('vis-container');

// Create a DataSet with data
var data = new vis.DataSet([{
    id: 1,
    content: 'First event',
    start: '2014-08-01'
}, {
    id: 2,
    content: 'Pi and Mash',
    start: '2014-08-08'
}, {
    id: 3,
    content: 'Wikimania',
    start: '2014-08-08',
    end: '2014-08-10'
}, {
    id: 4,
    content: 'Something else',
    start: '2014-08-20'
}, {
    id: 5,
    content: 'Summer bank holiday',
    start: '2014-08-25'
}]);

// Configuration for the Timeline as JSON object
var options = {
    width: '100%',
    editable: true, /* this option means you can add or remove items by clicking on the timeline */
    margin: {
        item: 20
    }
};

// Create a Timeline
var timeline = new vis.Timeline(container, data, options);
