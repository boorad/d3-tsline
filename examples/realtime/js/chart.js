
// initial values
var start = (new Date().getTime())

// chart instantiation
var chart = new d3_tsline("#chart");
chart.parse_date = function(dt) {
    // we use seconds, Date uses millis
    return new Date(dt*1000);
};
chart.view_span = 10; // show 20 secs by default
chart.scroll_interval = 1000; // one sec (in millis)
chart.series = [{
        "name" : "Male",
        "css"  : "male"
    }, {
        "name" : "Female",
        "css"  : "female"
    }
];
//chart.setSeriesData( [ [], [] ] ); // i.e. start with no data
chart.fill_left_pts(1, 50.0, 0);
chart.render();

// client's responsibility for d3tsline scrolling is to populate
// chart.next_pts, which is an array of data series 'y' values for the next
// point(s) to be drawn during the next interval.
var start = Math.floor(new Date().getTime()/1000);

// refresh data loop
var refresh_data = window.setInterval( function() {
    var sec = Math.floor(new Date().getTime()/1000) - start;
    var y1 = Math.sin(sec/3) * 50 + 50;
    var y2 = Math.cos(sec/3) * 50 + 50;
    chart.next_pts = [y1 ,y2];
}, 300 );

chart.start_scroll(); // begin scrolling

// shut down refresh loops after a few secs (for dev)
var cmd =
        "window.clearInterval(refresh_data);";
    //+    "window.clearInterval(refresh_chart);";
var cancel_refresh = setTimeout(cmd, 120 * 1000);
