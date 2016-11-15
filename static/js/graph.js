queue()
    .defer(d3.json, "/donorsUS/projects")
    .defer(d3.json, "static/geoson/us-states.json")
    .await(makeGraphs);

function makeGraphs(error, projectsJson, statesJson) {

   //Clean projectsJson data
   var donorsUSProjects = projectsJson;
   var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
   donorsUSProjects.forEach(function (d) {
       d["date_posted"] = dateFormat.parse(d["date_posted"]);
       d["date_posted"].setDate(1);
       d["total_donations"] = +d["total_donations"];
   });


   //Create a Crossfilter instance
   var ndx = crossfilter(donorsUSProjects);

   //Define Dimensions
   var dateDim = ndx.dimension(function (d) {
       return d["date_posted"];
   });
   var resourceTypeDim = ndx.dimension(function (d) {
       return d["resource_type"];
   });
   var povertyLevelDim = ndx.dimension(function (d) {
       return d["poverty_level"];
   });
   var stateDim = ndx.dimension(function (d) {
       return d["school_state"];
   });
   var totalDonationsDim = ndx.dimension(function (d) {
       return d["total_donations"];
   });
   var fundingStatus = ndx.dimension(function (d) {
       return d["funding_status"];
   });
    var schoolMetro = ndx.dimension(function (d) {
       return d["school_metro"];
   });
    var primaryFocusArea = ndx.dimension(function (d) {
       return d["primary_focus_area"];
   });


   //Calculate metrics
   var numProjectsByDate = dateDim.group();
   var numProjectsByResourceType = resourceTypeDim.group();
   var numProjectsByPovertyLevel = povertyLevelDim.group();
   var numProjectsByFundingStatus = fundingStatus.group();
   var totalDonationsByState = stateDim.group().reduceSum(function (d) {
       return d["total_donations"];
   });
   var stateGroup = stateDim.group();
   var numProjectsByMetro = schoolMetro.group();
    var all = ndx.groupAll();
   var totalDonations = ndx.groupAll().reduceSum(function (d) {
       return d["total_donations"];
   });
   var max_state = totalDonationsByState.top(1)[0].value;
   var numProjectsByFocusArea = primaryFocusArea.group();

   var amountByFocusArea = primaryFocusArea.group().reduce(
		                function (p, d) {
		                    p.amount += +d["total_donations"];
		                    p.count += 1;
		                    return p;
		                },
		                function (p, d) {
		                    p.amount -= +d["total_donations"];
		                    p.count -= 1;
		                    return p;
		                },
		                function () {
		                    return {amount: 0, count: 0};
		                });


   //Define values (to be used in charts)
   var minDate = dateDim.bottom(1)[0]["date_posted"];
   var maxDate = dateDim.top(1)[0]["date_posted"];
   var r_domain = d3.extent(primaryFocusArea.group().top(Infinity).map(function(d) { return d.value; }));
   var currFormat = d3.format("$,.0f");

    // tooptip
		var tooltip = d3.select("body")
		    .append("div")
		    .style({
		        "position": "absolute",
		        "z-index": "10",
		        "visibility": "hidden"
		    })
		    .attr({
		        "class": "tooltip introCopy"
		    });



   //Charts
   var timeChart = dc.barChart("#time-chart");
   var resourceTypeChart = dc.rowChart("#resource-type-row-chart");
   var povertyLevelChart = dc.rowChart("#poverty-level-row-chart");
   var numberProjectsND = dc.numberDisplay("#number-projects-nd");
   var totalDonationsND = dc.numberDisplay("#total-donations-nd");
   var fundingStatusChart = dc.pieChart("#funding-chart");
   var metroChart = dc.pieChart("#metro-chart");
   var usChart = dc.geoChoroplethChart("#us-chart");
   var focusAreaChart = dc.rowChart("#focus-area-chart");
   focusAreaBubble = dc.bubbleChart("#focus-area-bubble-chart");
   //remove 'var' for reset to work http://stackoverflow.com/questions/21550270/dc-js-unable-to-redraw-charts

   selectField = dc.selectMenu('#menu-select')
       .dimension(stateDim)
       .group(stateGroup);


   numberProjectsND
       .formatNumber(d3.format("d"))
       .valueAccessor(function (d) {
           return d;
       })
       .group(all)
	   .formatNumber(d3.format(",.0f"));

   totalDonationsND
       .formatNumber(d3.format("d"))
       .valueAccessor(function (d) {
           return d;
       })
       .group(totalDonations)
       .formatNumber(d3.format(".3s"));

 timeChart
       .width(800)
       .height(200)
       .margins({top: 10, right: 50, bottom: 30, left: 50})
       .dimension(dateDim)
       .group(numProjectsByDate)
       .transitionDuration(500)
       .x(d3.time.scale().domain([minDate, maxDate]))
       .elasticY(true)
       .xAxisLabel("Year")
       .yAxis().ticks(4);

   resourceTypeChart
       .width(300)
       .height(250)
       .dimension(resourceTypeDim)
       .group(numProjectsByResourceType)
       .xAxis().ticks(4);

   povertyLevelChart
       .width(300)
       .height(250)
       .dimension(povertyLevelDim)
       .group(numProjectsByPovertyLevel)
       .xAxis().ticks(4);

   fundingStatusChart
       .height(220)
       .radius(90)
       .innerRadius(40)
       .transitionDuration(1500)
       .dimension(fundingStatus)
       .group(numProjectsByFundingStatus);

    metroChart
       .height(220)
       .radius(90)
       .innerRadius(40)
       .transitionDuration(1500)
       .dimension(schoolMetro)
       .group(numProjectsByMetro);

    usChart
        .width(600)
		.height(330)
		.dimension(stateDim)
		.group(totalDonationsByState)
		.colors(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"])
		.colorDomain([0, max_state])
		.overlayGeoJson(statesJson["features"], "state", function (d) {
			return d.properties.name;
		})
		.projection(d3.geo.albersUsa()
    				.scale(600)
    				.translate([340, 150]))
		.title(function (p) {
			return "State: " + p["key"]
					+ "\n"
					+ "Total Donations: $" + Math.round(p["value"]);
		});

    focusAreaChart
       .width(300)
       .height(250)
       .dimension(primaryFocusArea)
       .group(numProjectsByFocusArea)
       .xAxis().ticks(4);

     focusAreaBubble
		        .width(900)
		        .height(400)
		        .dimension(primaryFocusArea)
		        .group(amountByFocusArea)
		        .keyAccessor(function(p) {
		            return p.value.amount;
		        })
		        .valueAccessor(function(p) {
		            return p.value.count;
		        })
		        .radiusValueAccessor(function(p) {
		            return p.value.count;
		        })
		        .x(d3.scale.linear().domain([0, 10000]))
		        .r(d3.scale.linear().domain(r_domain))
		        .minRadiusWithLabel(15)
		        .elasticY(true)
		        .yAxisPadding(400)
		        .elasticX(true)
		        .xAxisPadding(400)
		        .margins({
		            top: 10,
		            right: 50,
		            bottom: 50,
		            left: 50
		        })
		        .maxBubbleRelativeSize(0.04)
		        .ordinalColors(["#3182bd","#6baed6","#9ecae1","#c6dbef","#e6550d","#fd8d3c","#fdae6b"])
		        .renderHorizontalGridLines(true)
		        .renderVerticalGridLines(true)
		        .renderLabel(true)
		        .renderTitle(false)
		        .xAxisLabel("Amount ($)")
		        .yAxisLabel("# of Donations")
		        .transitionDuration(1000)
		        // .xAxis().tickFormat("s")
		        ;


   dc.renderAll();

	$('#loading').hide();

    d3.selectAll('#focus-area-bubble-chart g circle').on("mouseover", showProgramDetail).on("mouseout", hideDetail); // using jQuery Starts With Selector [name^=”value”] also works with D3; http://api.jquery.com/attribute-starts-with-selector/

    function showProgramDetail() {

		        // show tooltip with information from the __data__ property of the element
		        var d = this.__data__;
		        var program = d.key;
		        var count = d.value.count;
		        var amount = d.value.amount;

		        var content = "<b>Program: </b>" + program + "<br/>" +
		            "<b>Amount: </b>" + currFormat(amount) + "<br/>" +
		            "<b>Count: </b>" + count + "<br/>";

		        return tooltip.style({
		                "visibility": "visible",
		                "top": (event.pageY - 10) + "px",
		                "left": (event.pageX + 10) + "px"
		            })
		            .html(content);
		    }

		    // // Hide tooltip on hover
		    function hideDetail() {

		        // hide tooltip
		        return tooltip.style("visibility", "hidden");
		    };



}