
var url = "aapl.csv";
var mychart = new d3_tsline();

d3.csv(url, function(data) {
    mychart.draw_chart(data);
});


function d3_tsline() {

    var self = this;

    // TODO: expose these
    self.selector = "#chart";
    self.margins = [20, 20, 20, 20]; // top, left, bottom, right (margins)
    self.width = 960;
    self.height = 400;
    self.summary_height = 50;
    self.handle_height = 14;
    self.view_span = 64; // view_span (in data points)
    self.parse = d3.time.format("%b %d, %Y").parse;

    // slider dimensions (in px)
    self.slider = {
        x: 729,
        w: 171,
        max_x: 729
    };

    // TODO: change 20 below to y axis 'width' (see draw_view above)
    var lm =  self.margins[1] + 20; // left margin, including y axis

    self.draw_chart = function(data) {
        self.data = data;
        self.build_dom();

        // calcs for view window and slider
        view_end = data.length - 1;
        view_start = (view_end - this.view_span < 0)
            ? 0 : view_end - this.view_span;
        self.slider.w = Math.round(self.width * (self.view_span / data.length));
        self.slider.x = self.slider.max_x = self.width - self.slider.w -
            self.margins[1] - self.margins[3] - 20;

        // Parse dates and numbers. We assume values are sorted by date.
        var parse = self.parse;
        data.forEach(function(d) {
            d.date = parse(d.date);
            d.val = +d.val;
        });

        // make view window slice data
        var view = data.slice(view_start, view_end);

        self.draw_view(view);
        self.draw_summary(data);
    };

    self.build_dom = function() {
        d3.select(this.selector)
            .append("div")
            .attr("class", "view");
        d3.select(this.selector)
            .append("div")
            .attr("class", "summary");
    };

    self.draw_view = function(values) {

        var m = self.margins,
            w = self.width - m[1] - m[3],
            h = self.height - m[0] - m[2];

        // Scales and axes. inverted domain for the y-scale: bigger is up!
        var x = d3.time.scale().range([m[1]+1, w]),
            y = d3.scale.linear().range([h, 0]),
            xAxis = d3.svg.axis().scale(x).tickSize(-h).tickSubdivide(false),
            yAxis = d3.svg.axis().scale(y).ticks(6).tickSize(-w + 20)
                .orient("left");

        // An area generator, for the light fill.
        var area = d3.svg.area()
            .interpolate("monotone")
            .x(function(d) { return x(d.date); })
            .y0(h)
            .y1(function(d) { return y(d.val); });

        // A line generator, for the dark stroke.
        var line = d3.svg.line()
            .interpolate("monotone")
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.val); });

        // Compute the minimum and maximum date, and the maximum val.
        x.domain([values[0].date, values[values.length - 1].date]);
        y.domain([d3.min(values, function(d) { return d.val; }),
                  d3.max(values, function(d) { return d.val; })]).nice();

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

        // Add the area path.
        svg.append("svg:path")
            .attr("class", "area")
            .attr("clip-path", "url(#clip)")
            .attr("d", area(values));

        // Add the x-axis.
        svg.append("svg:g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + h + ")")
            .call(xAxis);

        // Add the border.
        svg.append("svg:rect")
            .attr("class", "border")
            .attr("x", 20) // TODO: change to y axis 'width' somehow
            .attr("y", 0)
            .attr("width", w - m[3])
            .attr("height", h + m[2] + 1); // hide bottom border w/ +1

        // Add the y-axis.
        svg.append("svg:g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + m[1] + ",0)")
            .call(yAxis);

        // Add the line path.
        svg.append("svg:path")
            .attr("class", "line")
            .attr("clip-path", "url(#clip)")
            .attr("d", line(values));


    };

    self.draw_summary = function(values) {

        var m = self.margins,
            w = self.width - m[1] - m[3],
            h = self.summary_height;
        m[0] = 5; // top margin doesn't need to be huge

        // Scales and axes. inverted domain for the y-scale: bigger is up!
        var x = d3.time.scale().range([m[1]+1, w]),
            y = d3.scale.linear().range([h, 0]),
            xAxis = d3.svg.axis().scale(x).tickSize(-h).tickSubdivide(true),
            yAxis = d3.svg.axis().scale(y).ticks(4).orient("left");

        // An area generator, for the light fill.
        var area = d3.svg.area()
            .interpolate("monotone")
            .x(function(d) { return x(d.date); })
            .y0(h)
            .y1(function(d) { return y(d.val); });

        // A line generator, for the dark stroke.
        var line = d3.svg.line()
            .interpolate("monotone")
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d.val); });

        // Compute the minimum and maximum date, and the maximum val.
        x.domain([values[0].date, values[values.length - 1].date]);
        y.domain([0, d3.max(values, function(d) { return d.val; })]).nice();

        // Add an SVG element with the desired dimensions and margin.
        var svg = d3.select(self.selector + " .summary").append("svg:svg")
            .attr("width", w + m[1] + m[3])
            .attr("height", h + m[2]);
        var g = svg.append("svg:g")
            .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

        // Add the clip path.
        g.append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", w)
            .attr("height", h);

        // Add the area path.
        g.append("svg:path")
            .attr("class", "area")
            .attr("clip-path", "url(#clip)")
            .attr("d", area(values));

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

        // Add the line path.
        g.append("svg:path")
            .attr("class", "line")
            .attr("clip-path", "url(#clip)")
            .attr("d", line(values));

        self.draw_slider(svg);

    };

    self.draw_slider = function(svg) {

        var m = self.margins;
        var sizer_w = 9,
            sizer_h = Math.round(self.summary_height / 3);

        // make the slider
        var slider = svg.append("svg:g")
            .attr("transform",
                  "translate(" + lm + "," + m[0] + ")")
            .append("svg:g")
            .attr("class", "slider")
            .attr("transform",
                  "translate(" + self.slider.x + ")");

        // left border and sizer
        var left = slider.append("svg:g")
            .attr("class", "left");

        left.append("svg:line")
            .attr("y1", 0 - m[0] + 1)
            .attr("y2", self.summary_height + m[0])
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
        var right = slider.append("svg:g")
            .attr("class", "right");

        right.append("svg:line") // summary right border
            .attr("y1", 0 - m[0] + 1)
            .attr("y2", self.summary_height + m[0])
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
        slider.append("svg:line")
            .attr("class", "slider-top-border")
            .attr("y1", -1 * m[0] + 1)
            .attr("y2", -1 * m[0] + 1)
            .attr("x1", 1)
            .attr("x2", self.slider.w);

        // bottom handle
        var handle = slider.append("svg:rect")
            .attr("class", "handle bottom")
            .attr("x", 0)
            .attr("y", self.summary_height + 1)
            .attr("width", self.slider.w)
            .attr("height", self.handle_height);

        // raised ridges
        var rt = Math.round(self.handle_height / 2) - 3 + self.summary_height;
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

    };

    self.move_slider = function(origin, dx) {
        self.slider.x = origin + dx;
        if( self.slider.x < 0 ) self.slider.x = 0;
        if( self.slider.x > self.slider.max_x )
            self.slider.x = self.slider.max_x;
        d3.select(this.selector + " .slider")
            .attr("transform", "translate(" + self.slider.x + ")")
        self.redraw_view();
    };

    self.redraw_view = function() {
        var max_elem = self.data.length - self.view_span;
        var start = Math.round(self.slider.x * (max_elem / self.slider.max_x));
        self.draw_view( self.data.slice(start, start + self.view_span) );
    };

};
