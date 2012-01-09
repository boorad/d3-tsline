

function d3_tsline(id) {

    var self = this;

    self.selector = id || "#chart";

    self.series = [];    // series metadata
    self.data = [];      // series data
    self.view_data = []; // view window data
    self.width = 960;
    self.height = 400;
    self.margins = [20, 20, 20, 20]; // top, left, bottom, right (margins)
    self.summary_height = 50;
    self.handle_height = 14;
    self.view_span = 64; // view_span (in data points)
    self.yaxis_w = 20;  // TODO fix this hack-ass shit, detect width
    // buffer (in px) for showing a bit more y axis than min/max values
    self.y_nice_buffer = 2;
    self.interpolation = 'cardinal';
    self.tension = 0.8;

    self.scroll_view = true;
    self.scroll_delay = 1000; // in ms

    // slider dimensions (in px)
    self.slider = {
        x: 729,
        w: 171,
        max_x: 729
    };

    // sizer values
    self.sizer_width = 9;

    self.left = {
        x: 0
    };

    self.right = {
        x: 0
    };

    //
    // functions
    //

    // ctor, called upon instantiation
    self.init = function() {
        self.build_dom();
    };

    // override this to shape your data to what d3-tsline wants
    // which is [ series, series, ... ]
    // and a series is: [ [epoch, value], [epoch, value], ... ]
    self.format_data = function(data) {
        // this default implementation assumes data is in proper format already
        return data;
    };

    self.parse_date = function(dt) { return dt; }; // js Date object
    //self.parse_date = function(dt) { return new Date(dt*1000); }; // epoch
    //self.parse_date = function(dt) {
    //    d3.time.format("%b %d, %Y").parse(dt); // mon d, yyyy
    //}
    self.parse_val = function(val) { return val; };

    self.parse_all_data = function() {
        // Parse dates and numbers. We assume values are sorted by date.
        self.data.forEach(function(series) {
            series.forEach(function(d) {
                d = self.parse_point(d);
            });
        });
    };

    self.parse_point = function(pt) {
        pt[0] = self.parse_date(pt[0]);
        pt[1] = self.parse_val(pt[1]);
        return pt;
    };

    // add a new point to each series, and redraw if update==true
    self.addSeriesPoints = function(points, update) {
        points = self.format_data(points);
        var i=0;
        points.forEach(function(point) {
            point = self.parse_point(point);
            self.data[i++].push(point);
        });
        if( update ) self.update();
    };

    self.update = function() {
        self.render();
        self.move_scroller();
    };

    self.move_scroller = function() {
        var s = self.view_svg.select(".scroller");
        var x = self.x( self.width, true );
        var diff = x(1) - x(0);
        s.attr("transform", "translate(" + 0 + ")")
            .transition()
            .ease("linear")
            .duration(self.scroll_delay)
            .attr("transform", "translate(" + -1 * diff + ")");
    };

    // calcs for view window and slider
    self.update_view_calcs = function() {

        view_end = self.data[0].length - 1 || 0;
        view_start = ((view_end - self.view_span) < 0)
            ? 0 : view_end - self.view_span;

        // make view window slice data arrays (one per series)
        var data = [];
        self.data.forEach(function(series) {
            data.push( series.slice(view_start, view_end+1) );
        });
        self.view_data = data;

        self.slider.w = Math.round(self.width *
                                   (self.view_span / self.data[0].length));
        self.slider.x = self.slider.max_x = self.width - self.slider.w;
        if( self.slider.x < 0 ) {
            self.slider.w = self.width;
            self.slider.x = self.slider.max_x = 0;
        }

    };

    self.render = function() {
        if( !self.is_valid( self.series ) ) return;
        self.data = self.format_data(self.data);
        self.update_view_calcs();
        self.draw_view();
        self.draw_summary();
    };

    self.is_valid = function(arr) {
        if( arr == null ) return false;
        if( arr.length == 0 ) return false;
        return true;
    };

    self.build_dom = function() {
        d3.select(this.selector)
            .append("div")
            .attr("class", "view");
        d3.select(this.selector)
            .append("div")
            .attr("class", "summary");
    };

    // if we have fewer data points than self.view_span, fill in data to left
    // so the chart seems to start from the right and scroll left
    self.fill_left_pts = function(interval, fill_value) {
        var len = self.data[0].length;
        // TODO: if no data is provided and we call this function, what is the
        // default min_x?  maybe provide it as 3rd optional argument?
        var min_x = 0;
        try {
            min_x = self.data[0][0][0].valueOf();
        } catch(e) {}
        for( var i = min_x - 1;
             i > (min_x - (self.view_span - len) - 1);
             i = i - interval ) {
            self.data.forEach(function(series) {
                series.unshift([i,fill_value || null]);
            });
        }
    };

    // An area generator, for the light fill.
    self.areamaker = function(w, h, offset_for_scroll) {
        var x = self.x(w, offset_for_scroll);
        var y = self.y(h);
        return d3.svg.area()
            .x(function(d) { return x(d[0]); })
            .y0(h)
            .y1(function(d) { return y(d[1]); })
            .interpolate(self.interpolation).tension(self.tension);
    };

    // A line generator, for the dark stroke.
    self.linemaker = function(w, h, offset_for_scroll) {
        var x = self.x(w, offset_for_scroll);
        var y = self.y(h);
        return d3.svg.line()
            .x( function(d) { return x(d[0]) })
            .y( function(d) { return y(d[1]) })
            .interpolate(self.interpolation).tension(self.tension);
    };

    // Scales and axes. inverted domain for the y-scale: bigger is up!
    self.discover_range = function(data) {

        var domain = self.domain(data);

        self.x = function(w, offset_for_scroll) {
            var diff = 0;
            if( offset_for_scroll ) diff = w / data[0].length;
            return d3.scale.linear()
                .range([1, w + diff]) // overlap to make smooth scroll effect
                .domain(domain.x);
        };
        self.y = function(h) {
            return d3.scale.linear()
                .range([h, 0])
                .domain(domain.y).nice();
        };
        self.xAxis = function(w,h) {
            var x = self.x(w);
            return d3.svg.axis()
                .scale(x)
                .tickSize(-1 * h)
                .tickSubdivide(false);
        };
        self.yAxis = function(w,h) {
            var y = self.y(h);
            return d3.svg.axis()
                .scale(y)
                .ticks(6)
                .tickSize(4)
                .orient("right");
        };
    };

    self.domain = function(data) {

	var values = [];

        // get all y values from all series
	data.forEach( function(series) {
	    series.forEach( function(d) {
		values.push( d[1] );
	    } );
	} );

        // get x min/max from the first series only
        var first = data[0];
	var xMin = first[0][0];
	var xMax = first[ first.length - 1 ][0];

	var yMin = d3.min( values ) - self.y_nice_buffer;
	var yMax = d3.max( values ) + self.y_nice_buffer;

	return { x: [xMin, xMax], y: [yMin, yMax] };
    };


    // draw the top view pane
    self.draw_view = function() {

        var values = self.view_data;
        self.discover_range(values);

        // axis vars
        var yAxis = self.yAxis(self.width, self.height);

        var view = d3.select(this.selector + " .view");
        view.html(""); // clear everything out of container

        // Add an SVG element with the desired dimensions and margin.
        var svg = self.view_svg = view.append("svg:svg")
            .attr("width", self.width)
            .attr("height", self.height);

        self.draw_scroller();

        // Add the y-axis.
        svg.append("svg:g")
            .attr("class", "y axis")
            .call(yAxis);
    };

    self.draw_scroller = function() {

        // remove old
        self.view_svg.selectAll(".scroller").remove();

        var xAxis = self.xAxis(self.width, self.height);
        var scroller = self.view_svg.append("svg:g")
            .attr("class", "scroller");

        // Add the x-axis.
        scroller.append("svg:g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (self.height - 15) + ")")
            .call(xAxis);

        // Add the line paths (one per series)
        // the selectAll should return only the series line <path> elements
        // i.e. the same number of lines as there are data arrays in self.data
        var paths = scroller.selectAll("path.line")
            .data(self.view_data)
            .enter().append("svg:path")
            .attr("d", self.linemaker(self.width, self.height, true))
            .attr("class", "line")
            .attr("clip-path", "url(#clip)");

        var i=0;
        self.series.forEach( function(series) {
            series.path = paths[0][i++];
            var clazz = series.path.getAttribute("class");
            if( series.css ) {
                series.path.setAttribute("class", clazz + " " + series.css);
            }
        });

        return scroller;
    };

    self.draw_summary = function() {

        var values = self.data;
        //self.discover_range(values);

        // remove old
        var summary = d3.select(self.selector + " .summary");
        summary.selectAll("*").remove();

        var w = self.width,
            h = self.summary_height;

        // Add an SVG element with the desired dimensions and margin.
        var svg = summary.append("svg:svg")
            .attr("width", w)
            .attr("height", h + self.handle_height + 1);
        var g = svg.append("svg:g");

        // Add the clip path.
        g.append("svg:clipPath")
            .attr("id", "summary-clip")
            .append("svg:rect")
            .attr("width", w)
            .attr("height", h);

        // Add the border.
        g.append("svg:rect")
            .attr("class", "border")
            .attr("x", 0)
            .attr("y", 1)
            .attr("width", w - 1)
            .attr("height", h);

        // Add top border
        g.append("svg:line")
            .attr("class", "top_border")
            .attr("y1", 1)
            .attr("y2", 1)
            .attr("x1", 0)
            .attr("x2", w);

        // Add the line paths (one per series)
        var paths = g.selectAll("path.line.summary")
            .data(values)
            .enter().append("svg:path")
            .attr("d", self.linemaker(w, h, false))
            .attr("class", "line summary")
            .attr("clip-path", "url(#summary-clip)");

        var i=0;
        self.series.forEach( function(series) {
            series.summary_path = paths[0][i++];
            var clazz = series.summary_path.getAttribute("class");
            series.summary_path.setAttribute("class", clazz + " " + series.css);
        });

        self.draw_slider(svg);

    };

    self.draw_slider = function(svg) {

        var sizer_w = self.sizer_width,
            sizer_halfw = Math.floor(sizer_w/2),
            sizer_h = Math.round(self.summary_height / 3);

        // slider_container
        var slider_container = svg.append("svg:g")
            .append("svg:g")
            .attr("class", "slider_container")
            .attr("transform",
                  "translate(" + (self.slider.x + sizer_halfw + 1) + ")");

        // slider
        var slider = svg.append("svg:g")
            .attr("class", "slider")
            .attr("transform",
                  "translate(" + (self.slider.x + sizer_halfw + 1) + ")");

        // left border and sizer
        var left = slider_container.append("svg:g")
            .attr("class", "left");

        left.append("svg:line")
            .attr("y1", 1)
            .attr("y2", self.summary_height)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("class", "border");

        left.append("svg:rect")
            .attr("class", "sizer")
            .attr("x", -1 * sizer_halfw)
            .attr("y", Math.round(self.summary_height/2)-Math.round(sizer_h/2))
            .attr("width", sizer_w)
            .attr("height", sizer_h)
            .attr("rx", 2)
            .attr("ry", 2)

        // right border and sizer
        var right = slider_container.append("svg:g")
            .attr("class", "right");

        right.append("svg:line") // summary right border
            .attr("y1", 1)
            .attr("y2", self.summary_height)
            .attr("x1", self.slider.w - sizer_w - 2)
            .attr("x2", self.slider.w - sizer_w - 2)
            .attr("class", "border");

        right.append("svg:rect")
            .attr("class", "sizer")
            .attr("x", self.slider.w - sizer_w - sizer_halfw - 2)
            .attr("y", Math.round(self.summary_height/2)-Math.round(sizer_h/2))
            .attr("width", sizer_w)
            .attr("height", sizer_h)
            .attr("rx", 2)
            .attr("ry", 2)

        // slider top 'clear'  border
        slider_container.append("svg:line")
            .attr("class", "slider-top-border")
            .attr("y1", 1)
            .attr("y2", 1)
            .attr("x1", 1)
            .attr("x2", self.slider.w - sizer_w - 2);

        // bottom handle
        var handle = slider.append("svg:rect")
            .attr("class", "handle bottom")
            .attr("x", 0)
            .attr("y", self.summary_height + 1)
            .attr("width", self.slider.w - sizer_w - 2)
            .attr("height", self.handle_height);

        // raised ridges
        var rt = Math.round(self.handle_height / 2) - 3 +
            self.summary_height;
        var rl = Math.round(self.slider.w / 2) - 4;
        for( var i=0; i < 4; i++ ) {
            slider.append("svg:line")
                .attr("class", "handle-ridges odd")
                .attr("y1", rt)
                .attr("y2", rt + 5)
                .attr("x1", rl + (i*2))
                .attr("x2", rl + (i*2));

            slider.append("svg:line")
                .attr("class", "handle-ridges even")
                .attr("y1", rt + 1)
                .attr("y2", rt + 6)
                .attr("x1", rl + (i*2) + 1)
                .attr("x2", rl + (i*2) + 1);
        }

        // dragging
        slider.call(d3.behavior.drag()
                  .on("dragstart", function(d) {
                      this.__origin__ = self.slider.x;
                      this.__offset__ = 0;
                  })
                  .on("drag", function(d) {
                      this.__offset__ += d3.event.dx;
                      self.move_slider(this.__origin__, this.__offset__);
                  })
                  .on("dragend", function() {
                      delete this.__origin__;
                      delete this.__offset__;
                  }));

        // dragging on left/right sizers
        var sizer_spec = d3.behavior.drag()
                  .on("dragstart", function(d) {
                      var clazz = this.className.baseVal;
                      this.__origin__ = self[clazz].x;
                      this.__offset__ = 0;
                  })
                  .on("drag", function(d) {
                      this.__offset__ += d3.event.dx;
                      self.move_sizer(this);
                  })
                  .on("dragend", function() {
                      delete this.__origin__;
                      delete this.__offset__;
                      self.sizer_end(this);
                  });
        left.call(sizer_spec);
        right.call(sizer_spec);

    };

    self.move_slider = function(origin, dx) {
        var sizer_w = self.sizer_width;
        var sizer_halfw = Math.floor(sizer_w/2) + 1;

        self.slider.x = origin + dx;
        if( self.slider.x < sizer_halfw ) self.slider.x = sizer_halfw;
        if( self.slider.x > self.slider.max_x + sizer_halfw )
            self.slider.x = self.slider.max_x + sizer_halfw;
        d3.select(this.selector + " .slider_container")
            .attr("transform", "translate(" + self.slider.x + ")")
        var slider_new_x = self.slider.x;
        d3.select(this.selector + " .slider")
            .attr("transform", "translate(" + slider_new_x + ")")
        self.redraw_view();
    };

    self.move_sizer = function(sizer) {
        var clazz = sizer.className.baseVal;
        self[clazz].x = sizer.__origin__ + sizer.__offset__;
        var sizer_new_x = self[clazz].x;
        d3.select(this.selector + " ." + clazz)
            .attr("transform", "translate(" + sizer_new_x + ")")
    };

    self.sizer_end = function(sizer) {
        var clazz = sizer.className.baseVal;
        var diffpx = self[clazz].x;
        // px to data points
        var diff = Math.round(diffpx * (self.data.length / self.width));
        //console.log(self.data.length, self.width, diffpx, diff);
        if( clazz == "left" ) {
            self.slider.x += diffpx;
            self.view_span -= diff;
        } else {
            self.view_span += diff;
        }
        // reset sizer x
        self[clazz].x = 0;
        self.redraw_view();
    };

    self.redraw_view = function() {
        var max_elem = self.data.length - self.view_span;
        var start = Math.round(self.slider.x * (max_elem / self.slider.max_x));
        self.draw_view( self.data.slice(start, start + self.view_span) );
    };

    // call constructor (after all functions have been loaded)
    self.init();

};
