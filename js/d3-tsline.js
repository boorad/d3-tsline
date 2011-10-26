
var url = "aapl.csv";
var mychart = new d3_tsline();

d3.csv(url, function(data) {
    mychart.draw_chart(data);
});


function d3_tsline() {

    var self = this;

    // TODO: expose these
    this.selector = "#chart";
    this.margins = [20, 20, 20, 20]; // top, left, bottom, right (margins)
    this.width = 960;
    this.height = 400;
    this.summary_height = 50;
    this.view_span = 90; // view_span (in data points)
    this.parse = d3.time.format("%b %d, %Y").parse;

    // internal
    var init_max_x = self.width - 90 - self.margins[1] - self.margins[3] - 20;
    // TODO: the 90's above is slider width, hook to view_span
    // TODO: 20 above is y axis width

    this.slider = {
        x: init_max_x,
        w: 90, // TODO: hook to view_span, which is in data points
        max_x: init_max_x
        // TODO: max_x is gonna need to be in redraw()
    };

    this.draw_chart = function(data) {
        this.build_dom();
        view_end = data.length - 1;
        view_start = (view_end - this.view_span < 0)
            ? 0 : view_end - this.view_span;

        // Parse dates and numbers. We assume values are sorted by date.
        var parse = this.parse;
        data.forEach(function(d) {
            d.date = parse(d.date);
            d.val = +d.val;
        });

        // make view window slice data
        var view = data.slice(view_start, view_end);

        this.draw_view(view);
        this.draw_summary(data);
    };

    this.build_dom = function() {
        d3.select(this.selector)
            .append("div")
            .attr("class", "view");
        d3.select(this.selector)
            .append("div")
            .attr("class", "summary");
    };

    this.draw_view = function(values) {

        var m = this.margins,
            w = this.width - m[1] - m[3],
            h = this.height - m[0] - m[2];

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
        var svg = d3.select(this.selector + " .view").append("svg:svg")
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

    this.draw_summary = function(values) {

        var m = this.margins,
            w = this.width - m[1] - m[3],
            h = this.summary_height;
        m[0] = 5; // top margin doesn't need to be huge

        // Scales and axes. inverted domain for the y-scale: bigger is up!
        var x = d3.time.scale().range([m[1]+1, w]),
            y = d3.scale.linear().range([h, 0]),
            xAxis = d3.svg.axis().scale(x).tickSize(-h).tickSubdivide(true),
            yAxis = d3.svg.axis().scale(y).ticks(4).orient("left");

        // TODO: change 20 below to y axis 'width' (see draw_view above)
        var lm =  m[1] + 20; // left margin, including y axis

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
        var svg = d3.select(this.selector + " .summary").append("svg:svg")
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


        // TODO: separate function
        // make the slider
        var slider = svg.append("svg:g")
            .attr("transform",
                  "translate(" + lm + "," + m[0] + ")")
            .append("svg:g")
            .attr("class", "slider")
            .attr("transform",
                  "translate(" + this.slider.x + ")");
            //.attr("width", w + m[1] + m[3])
            //.attr("height", h + m[2])

        slider.append("svg:rect") // slider border
            .attr("x", 0)
            .attr("y", 0 - m[0] + 1)
            .attr("width", this.slider.w)
            .attr("height", h + m[0]);

        slider.append("svg:line") // slider top border
            .attr("class", "slider-top-border")
            .attr("y1", -1 * m[0] + 1)
            .attr("y2", -1 * m[0] + 1)
            .attr("x1", 1 )
            .attr("x2", this.slider.w );

        slider.append("svg:rect")
            .attr("class", "handle bottom")
            .attr("x", 0)
            .attr("y", h + 1)
            .attr("width", this.slider.w)
            .attr("height", 14);

        slider
            .call(d3.behavior.drag()
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

    this.move_slider = function(origin, dx) {
        this.slider.x = origin + dx;
        if( this.slider.x < 0 ) this.slider.x = 0;
        if( this.slider.x > this.slider.max_x )
            this.slider.x = this.slider.max_x;
        //console.log(this.slider.x);
        d3.select(this.selector + " .slider")
            .attr("transform", "translate(" + this.slider.x + ")")
        // this.redraw();
    };

};
