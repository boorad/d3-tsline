// set up instance of d3-tsline chart
function chart_init(id) {
    var mychart = new d3_tsline(id);

/*
    // override format_data function
    mychart.format_data = function(json) {
        return json;
    };
*/
    mychart.parse_date = function(dt) {
        // we use seconds, Date uses millis
        return new Date(dt*1000);
    };

    mychart.view_span = 10; // show 20 secs by default
    return mychart;
}

function next_json(last_json) {
    // temporarily override api values for dev
    var ret = {};
    var last_pts = [ [0, 50.0], [0, 50.0] ]
    if( last_json && last_json.data ) {
        last_pts = process_json(last_json);
    }
    var i = last_pts[0][0] + 1;
    var pt = {
        _id: i,
        segments: {
            male: {
                average: ((Math.sin(last_pts[0][1] + i) + 1) / 2.0) * 100,
                count: i + 134981,
                sum: (i + 134981)
            },
            female: {
                average: ((Math.cos(last_pts[1][1] + i) + 1) / 2.0) * 100,
                count: i + 146222,
                sum: (i + 146222)
            }
        }
    };
    ret.data = [pt];
    ret.surveyResponses = surveyResponses();
    return ret;
}

function surveyResponses() {
    var ret = {
        "gender" : {
            "answers" : {
                "male" : {
                    "body" : "Male",
                    "count" : 1,
                    "id" : "male"
                },
                "female" : {
                    "body" : "Female",
                    "count" : 0,
                    "id" : "female"
                }
            },
            "body" : "What is your gender?"
        }
    };
    return ret;
}

// turn json into data series array
// TODO: only works on first point, doesn't factor in multiple pts in json.data
function process_json(json) {
    var data = json.data[0];
    return [
        [data._id, data.segments.male.average],
        [data._id, data.segments.female.average]
    ];
}

//
// global scope stuffs
//

// initial values
var last_json = null;    // holds last json response that we graphed
var current_json = null; // holds current json response before graphing
var start = (new Date().getTime())

// chart building
var chart = chart_init("#chart");
chart.series = [
    {
        "name" : "Male",
        "css"  : "male"
    },
    {
        "name" : "Female",
        "css"  : "female"
    }
];
//chart.setSeriesData( [ [], [] ] ); // i.e. start with no data
chart.fill_left_pts(1, 50.0, 0);
chart.update(); // TODO: should be render or init or something

if( true ) {

// refresh data loop
var refresh_data = window.setInterval( function() {
    var x = (new Date().getTime() - start) / 100;
//    console.log(x);
    var y1 = (Math.random() * 100);
    var y2 = (Math.random() * 100);
    chart.next_pts = [ [x,y1] ,[x,y2]];
	//console.log("Next point: "+chart.next_pts);
}, 400 );

/*
// refresh chart loop
var refresh_chart = window.setInterval( function() {
    next_pts = process_json(current_json);
    chart.addSeriesPoints(next_pts, true);
    last_json = current_json;
}, 1000 );
*/

// shut down refresh loops after a few secs (for dev)
var cmd =
        "window.clearInterval(refresh_data);";
    //+    "window.clearInterval(refresh_chart);";
var cancel_refresh = setTimeout(cmd, 120 * 1000);

}
