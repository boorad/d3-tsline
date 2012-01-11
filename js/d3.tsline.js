

function d3_tsline(id) {

    var self = this;

    self.selector = id || "#chart";

    self.series = [];    // series metadata
    self.data = [];      // series data
    self.view_data = []; // view window data
    self.domain = {
        view:    { x: [0,0], y: [0,0] },
        summary: { x: [0,0], y: [0,0] }
    };

    self.width = 1000;
    self.height = 400;
    self.summary_height = 50;
    self.handle_height = 14;
    self.view_span = 64; // view_span (in data points)
    // buffer (in px) for showing a bit more y axis than min/max values
    self.y_nice_buffer = 2;
    self.orient_y = "right";
    self.interpolation = 'cardinal';
    self.tension = 0.8;

    self.scroll_view = true;
    self.scroll_delay = 1000; // in ms
    self.iters = 0;

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

    // TODO: setSeries() and detect when it's a single series and add the []

    self.setSeriesData = function(data) {
        data = self.format_data(data);
        data.forEach(function(series) {
            series.forEach(function(point) {
                point = self.parse_point(point);
            });
        });
        self.data = data;
        self.set_domain("summary", data);
    };

    // add a new point to each series, and redraw if update==true
    self.addSeriesPoints = function(points, update) {
        if( points ) {
            points = self.format_data(points);
            var i=0;
            points.forEach(function(point) {
                point = self.parse_point(point);
                //self.update_domain("summary", point);
                self.data[i++].push(point);
            });
        }
        if( update ) self.update();
    };

    self.update = function() {
        self.render();
        self.move_scroller();
    };

    self.move_scroller = function() {
        if( self.iters++ > 100 ) return;
        var diff = self.get_diff(self.width, self.view_data);
        // scroll_diff accounts for x() scale function in draw_view()
        // which renders the entire line one point wider to scroll smoothly
        var scroll_diff = diff; //diff;//diff;//self.get_diff(self.width + diff, self.view_data);
        d3.select(self.selector + " .view .scroller")
            .attr("transform", "translate(" + 0 + ",0)")
            .transition()
            .ease("linear")
            .duration(self.scroll_delay)
            .attr("transform", "translate(" + -1 * scroll_diff + ")")
            .each("end", function() {
                self.addSeriesPoints(self.next_pts, true);
            });
    };

    // calcs for view window and slider
    self.update_view_calcs = function() {

        view_end = self.data[0].length || 0;
        view_start = ((view_end - self.view_span) < 0)
            ? 0 : view_end - self.view_span;

        // make view window slice data arrays (one per series)
        var data = [];
		var toAppend;
		
		//console.log("viewstart,end",view_start,view_end);
        self.data.forEach(function(series) {
			toAppend = series.slice(view_start, view_end);
            data.push(toAppend );
        });
        self.view_data = data;

        // note: set_domain gets expensive for updates/renders as the view
        // dataset gets larger
        self.set_domain("view", data);

/*
        self.slider.w = Math.round(self.width *
                                   (self.view_span / self.data[0].length));
        self.slider.x = self.slider.max_x = self.width - self.slider.w;
        if( self.slider.x < 0 ) {
            self.slider.w = self.width;
            self.slider.x = self.slider.max_x = 0;
        }
*/
    };

    self.get_diff = function(w, data) {
        return w / data[0].length;
    };

    self.render = function() {
        if( !self.is_valid( self.series ) ) return;
        self.update_view_calcs();
        self.draw_view();
        //self.draw_summary();
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
    self.fill_left_pts = function(interval, fill_value, seed_x) {
        // handle when no data set, make blank series data for each series
        if( !self.data || !self.data[0] ) {
            self.data = [];
            // TODO: handle when no series are set either
            self.series.forEach(function(series) {
                self.data.push( [] );
            });
        }
        var len = self.data[0].length;
        var min_x = 0;
        try {
            min_x = self.data[0][0][0].valueOf();
        } catch(e) {
            min_x = seed_x;
        }
        for( var i = min_x - 1;
             i > (min_x - (self.view_span - len) - 1);
             i = i - interval ) {
            self.data.forEach(function(series) {
                var date = self.parse_date(i);
                var value = self.parse_val(fill_value) || null;
                series.unshift([date,value]);
            });
        }
    };

    // set min/max values for x & y
    // loops through all data, so try not to run except during graph init
    self.set_domain = function(type, data) {
	var values = [];

        // get all y values from all series
	data.forEach( function(series) {
	    series.forEach( function(d) {
		values.push( d[1] );
	    } );
	} );

        var xMin = 0, xMax = 0, yMin = 0, yMax = 0;

        if( data && data[0] && data[0][0] ) {
            // get x min/max from the first series only
            var first = data[0];
	    xMin = first[0][0];
	    xMax = first[ first.length - 1 ][0];
            // get y min/max from values array built above
	    yMin = d3.min( values ) - self.y_nice_buffer;
	    yMax = d3.max( values ) + self.y_nice_buffer;
        }
		
	self.domain[type] = {
            //x: [xMax.getTime()-10*1000, xMax.getTime()],
			x:[xMax.getTime()-10*1000, xMax.getTime()],
//            y: [yMin, yMax]
            y: [0-1, 100+1]
        };
    };

    self.update_domain = function(type, point) {
        // min x
        if( point[0] < self.domain[type].x[0] )
            self.domain[type].x[0] = point[0];
        // max x
        if( point[0] > self.domain[type].x[1] )
            self.domain[type].x[1] = point[0];
        // min y
        if( point[1] < self.domain[type].y[0] )
            self.domain[type].y[0] = point[1];
        // max y
        if( point[1] > self.domain[type].y[1] )
            self.domain[type].y[1] = point[1];
    };

    // draw the top view pane
    self.draw_view = function() {
		//console.log("Drawing view");
        var w = self.width, h = self.height;
        var values = self.view_data;
        // set up scale and axis functions
		
        var diff = self.get_diff(w, values);
		/*
		var minX =  9999999;
		var maxX = -9999999;
		for (var curSeries in self.data)
		{
			var s = (self.data[curSeries]);
			for (var pt in s){
				var cur = s[pt];
				if (cur[0].getTime() < minX) { minX = cur[0].getTime(); }
				if (cur[0].getTime() > maxX) { maxX = cur[0].getTime(); }
			}
		}
		console.log(minX,maxX, maxX-minX);
		self.domain.view.x[0] = maxX-1000;
		self.domain.view.x[1] = maxX;
		console.log(self.domain.view
		*/
        var x = d3.scale.linear()
            .range([0, w])
            .domain(self.domain.view.x);
        var y = d3.scale.linear()
            .range([h, 0])
            .domain(self.domain.view.y).nice();
		console.log("domain length "+self.domain.view.x,self.domain.view.x[1]-self.domain.view.x[0]);
        xAxis = d3.svg.axis()
            .scale(x)
            .tickSize(-1 * h)
			.ticks(10)
			.orient("bottom");
            //.tickSubdivide(false);
        yAxis = d3.svg.axis()
            .scale(y)
            .ticks(5)
            .tickSize(10)
            .orient(self.orient_y);

        // A line generator, for the dark stroke.
        var line = d3.svg.line()
            .x( function(d) { return x(d[0]) })
            .y( function(d) { return y(d[1]) })
            .interpolate(self.interpolation).tension(self.tension);

        var view = d3.select(this.selector + " .view");
        view.selectAll("*").remove();
        // Add an SVG element with the desired dimensions and margin.
        var svg = view.append("svg:svg")
            .attr("width", w)
            .attr("height", h);

        // draw scroller group, with x axis and data line(s)

        // remove old
        svg.selectAll(".scroller").remove();

        var scroller = svg.append("svg:g")
            .attr("class", "scroller");


        // Add the line paths (one per series)
        // the selectAll should return only the series line <path> elements
        // i.e. the same number of lines as there are data arrays in self.data
		console.log(values[0][values[0].length-1][0].getTime());
        var paths = scroller.selectAll("path.line")
            .data(values)
            .enter().append("svg:path")
            .attr("d", line)
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
		
        // Add the x-axis.
        scroller.append("svg:g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (h - 15) + ")")
            .call(xAxis);

        // Add the y-axis.
        svg.append("svg:g")
            .attr("class", "y axis")
            .call(yAxis);
    };

    self.draw_summary = function() {

        var values = self.data;
        var w = self.width, h = self.summary_height;

        // set up scale and axis functions
        var diff = w / values[0].length;
        var x = d3.time.scale()
            .range([1, w + diff])
            .domain(self.domain.view.x);
        var y = d3.scale.linear()
            .range([h, 0])
            .domain(self.domain.summary.y).nice();
        xAxis = d3.svg.axis()
           // .scale(x)
			.ticks(4)
            //.tickSize(-1 * h)
            //.tickSubdivide(false);
        yAxis = d3.svg.axis()
            .scale(y)
            .ticks(6)
            .tickSize(4)
            .orient(self.orient_y);

        // A line generator, for the dark stroke.
        var line = d3.svg.line()
            .x( function(d) { return x(d[0]) })
            .y( function(d) { return y(d[1]) })
            .interpolate(self.interpolation).tension(self.tension);

        // remove old dom elements
        var summary = d3.select(self.selector + " .summary");
        summary.selectAll("*").remove();

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
            .attr("d", line)
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
