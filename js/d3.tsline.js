

function d3_tsline(id) {

    var self = this;

    self.selector = id || "#chart";

    self.series = []; // series metadata
    self.data = [];   // series data

    self.width = 960;
    self.height = 400;
    self.margins = [20, 20, 20, 20]; // top, left, bottom, right (margins)
    self.summary_height = 50;
    self.handle_height = 14;
    self.view_span = 64; // view_span (in data points)
    self.yaxis_w = 20;  // TODO fix this hack-ass shit, detect width

    self.interpolation = 'cardinal';
    self.tension = 0.8;

    // slider dimensions (in px)
    self.slider = {
        x: 729,
        w: 171,
        max_x: 729
    };

    // sizer values
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

    self.draw_chart = function() {

        if( !self.is_valid( self.series ) ) return;
        self.data = self.format_data(self.data);

        // calcs for view window and slider
        view_end = self.data[0].length - 1 || 0;
        view_start = ((view_end - this.view_span) < 0)
            ? 0 : view_end - this.view_span;
        self.inner_width = self.width - self.margins[1] - self.margins[3] -
            self.yaxis_w;
        self.slider.w = Math.round(self.width *
                                   (self.view_span / self.data[0].length));
        self.slider.x = self.slider.max_x = self.inner_width - self.slider.w;
        if( self.slider.x < 0 ) {
            self.slider.w = self.inner_width;
            self.slider.x = self.slider.max_x = 0;
        }

        // Parse dates and numbers. We assume values are sorted by date.
        self.data.forEach(function(series) {
            series.forEach(function(d) {
                d[0] = self.parse_date(d[0]);
                d[1] = self.parse_val(d[1]);
            });
        });

        // make view window slice data arrays (one per series)
        var view_data = [];
        self.data.forEach(function(series) {
            view_data.push( series.slice(view_start, view_end+1) );
        });

        self.discover_range();
        self.draw_view(view_data);
        self.draw_summary(self.data);
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

    // if we have fewer data points than self.view_span, fill in pts to left
    // so the chart seems to start from the right and scroll left
    self.fill_left_pts = function(interval, fill_value) {
        var len = self.data[0].length;
        var min_x = self.data[0][0][0].valueOf();
        for( var i = min_x - 1;
             i > (min_x - (self.view_span - len) - 1);
             i = i - interval ) {
            self.data.forEach(function(series) {
                series.unshift([i,fill_value || null]);
            });
        }
    };

    // An area generator, for the light fill.
    self.areamaker = function(w,h) {
        var x = self.x(w);
        var y = self.y(h);
        return d3.svg.area()
            .x(function(d) { return x(d[0]); })
            .y0(h)
            .y1(function(d) { return y(d[1]); })
            .interpolate(self.interpolation).tension(self.tension);
    };

    // A line generator, for the dark stroke.
    self.linemaker = function(w,h) {
        var x = self.x(w);
        var y = self.y(h);
        return d3.svg.line()
            .x( function(d) { return x(d[0]) })
            .y( function(d) { return y(d[1]) })
            .interpolate(self.interpolation).tension(self.tension);
    };

    // Scales and axes. inverted domain for the y-scale: bigger is up!
    self.discover_range = function() {
        var domain = self.domain();

        self.x = function(w) {
            //return d3.time.scale()
            return d3.scale.linear()
                .range([self.margins[1], w])
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
                .tickSize(-1 * w + 20)
                .orient("left");
        };
    };

    self.domain = function() {

	var values = [];
        var data = self.data;

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

	var yMin = d3.min( values );
	var yMax = d3.max( values );

	return { x: [xMin, xMax], y: [yMin, yMax] };
    };


    // draw the top view pane
    self.draw_view = function(values) {

        var m = self.margins;
        var w = self.width - m[1] - m[3];
        var h = self.height - m[0] - m[2];

        // axis vars
        var xAxis = self.xAxis(w,h);
        var yAxis = self.yAxis(w,h);

        var view = d3.select(this.selector + " .view");
        view.html(""); // clear everything out of container

        // Add an SVG element with the desired dimensions and margin.
        var svg = view.append("svg:svg")
            .attr("width", w + m[1] + m[3])
            .attr("height", h + m[0] + m[2])
            .append("svg:g")
            .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

        // Add the clip path.
        svg.append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", w)
            .attr("height", h);

        // Add the x-axis.
        svg.append("svg:g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + h + ")")
            .call(xAxis);

        // Add the border.
        svg.append("svg:rect")
            .attr("class", "border")
            .attr("x", self.yaxis_w)
            .attr("y", 0)
            .attr("width", w - m[3])
            .attr("height", h + m[2] + 1); // hide bottom border w/ +1

        // Add the y-axis.
        svg.append("svg:g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + m[1] + ",0)")
            .call(yAxis);

        // Add the line paths (one per series)
        // the selectAll should return only the series line <path> elements
        // i.e. the same number of lines as there are data arrays in self.data
        var paths = svg.selectAll("path.line")
            .data(self.data)
            .enter().append("svg:path")
            .attr("d", self.linemaker(w,h))
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

    };

    self.draw_summary = function(values) {

        var m = self.margins,
            w = self.width - m[1] - m[3],
            h = self.summary_height;
        m[0] = 5; // top margin doesn't need to be huge

        // Add an SVG element with the desired dimensions and margin.
        var svg = d3.select(self.selector + " .summary").append("svg:svg")
            .attr("width", w + m[1] + m[3])
            .attr("height", h + m[2]);
        var g = svg.append("svg:g")
            .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

        // Add the clip path.
        g.append("svg:clipPath")
            .attr("id", "summary-clip")
            .append("svg:rect")
            .attr("width", w)
            .attr("height", h);

        // Add the border.
        g.append("svg:rect")
            .attr("class", "border")
            .attr("x", m[1])
            .attr("y", 0 - m[0] + 1)
            .attr("width", w - m[3])
            .attr("height", h + m[0]);

        // Add top border
        g.append("svg:line")
            .attr("class", "top_border")
            .attr("y1", -1 * m[0] + 1)
            .attr("y2", -1 * m[0] + 1)
            .attr("x1", m[1])
            .attr("x2", w + 1);

        // Add the line paths (one per series)
        var paths = g.selectAll("path.line.summary")
            .data(self.data)
            .enter().append("svg:path")
            .attr("d", self.linemaker(w,h))
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

        var m = self.margins;
        var sizer_w = 9,
            sizer_h = Math.round(self.summary_height / 3);

        // slider_container
        var slider_container = svg.append("svg:g")
            .attr("transform",
                  "translate(" + (m[1] + self.yaxis_w) + "," + m[0] + ")")
            .append("svg:g")
            .attr("class", "slider_container")
            .attr("transform",
                  "translate(" + self.slider.x + ")");

        // slider
        var slider = svg.append("svg:g")
            .attr("class", "slider")
            .attr("transform",
                  "translate(" + (self.slider.x + m[1] + self.yaxis_w) + ")");

        // left border and sizer
        var left = slider_container.append("svg:g")
            .attr("class", "left");

        left.append("svg:line")
            .attr("y1", 0 - m[0] + 1)
            .attr("y2", self.summary_height)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("class", "border");

        left.append("svg:rect")
            .attr("class", "sizer")
            .attr("x", -4)
            .attr("y", Math.round(self.summary_height/2)-Math.round(sizer_h/2))
            .attr("width", sizer_w)
            .attr("height", sizer_h)
            .attr("rx", 2)
            .attr("ry", 2)

        // right border and sizer
        var right = slider_container.append("svg:g")
            .attr("class", "right");

        right.append("svg:line") // summary right border
            .attr("y1", 0 - m[0] + 1)
            .attr("y2", self.summary_height)
            .attr("x1", self.slider.w)
            .attr("x2", self.slider.w)
            .attr("class", "border");

        right.append("svg:rect")
            .attr("class", "sizer")
            .attr("x", self.slider.w-4)
            .attr("y", Math.round(self.summary_height/2)-Math.round(sizer_h/2))
            .attr("width", sizer_w)
            .attr("height", sizer_h)
            .attr("rx", 2)
            .attr("ry", 2)

        // slider top 'clear'  border
        slider_container.append("svg:line")
            .attr("class", "slider-top-border")
            .attr("y1", -1 * m[0] + 1)
            .attr("y2", -1 * m[0] + 1)
            .attr("x1", 1)
            .attr("x2", self.slider.w);

        // bottom handle
        var handle = slider.append("svg:rect")
            .attr("class", "handle bottom")
            .attr("x", 0)
            .attr("y", self.summary_height + m[0] + 1)
            .attr("width", self.slider.w)
            .attr("height", self.handle_height);

        // raised ridges
        var rt = Math.round(self.handle_height / 2) - 3 +
            self.summary_height + m[0];
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
        self.slider.x = origin + dx;
        if( self.slider.x < 0 ) self.slider.x = 0;
        if( self.slider.x > self.slider.max_x )
            self.slider.x = self.slider.max_x;
        d3.select(this.selector + " .slider_container")
            .attr("transform", "translate(" + self.slider.x + ")")
        var slider_new_x = self.slider.x + self.margins[1] + self.yaxis_w;
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
