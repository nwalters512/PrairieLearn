
define(['underscore', 'backbone', 'mustache', 'moment-timezone', 'renderer', 'TestFactory', 'text!TestDetailView.html'], function(_, Backbone, Mustache, moment, renderer, TestFactory, TestDetailViewTemplate) {

    var TestDetailView = Backbone.View.extend({

        tagName: 'div',

        events: {
            "click .resetTest": "resetTest",
            "click .resetTestForAll": "resetTestForAll",
            "click .finishTestForAll": "finishTestForAll",
            "click .reloadStats": "reloadStats",
        },

        initialize: function() {
            this.store = this.options.store;
            this.appModel = this.options.appModel;
            this.questions = this.options.questions;
            this.listenTo(this.model, "all", this.render);
            this.listenTo(this.store.testStatsColl, "all", this.render);
        },

        render: function() {
            var that = this;
            var tid = this.model.get("tid");
            var options = this.model.get("options");
            var data = {};
            data.tid = this.model.get("tid");
            data.title = this.model.get("set") + " " + this.model.get("number") + ": " + this.model.get("title");
            data.userUID = this.appModel.get("userUID");
            data.seeReset = this.appModel.hasPermission("deleteTInstances");
            data.seeFinish = this.appModel.hasPermission("editOtherUsers") && options && options.allowFinish;

            data.seeDownload = this.appModel.hasPermission("viewOtherUsers");
            data.testScoresFilename = this.model.get("tid") + "_scores.csv";
            data.testScoresLink = this.appModel.apiURL("testScores/" + data.testScoresFilename + "?tid=" + data.tid);
            data.testScoresCompassFilename = this.model.get("tid") + "_scores_compass.csv";
            data.testScoresCompassLink = this.appModel.apiURL("testScores/" + data.testScoresCompassFilename + "?tid=" + data.tid + "&format=compass");
            data.testScoresRawFilename = this.model.get("tid") + "_scores_raw.csv";
            data.testScoresRawLink = this.appModel.apiURL("testScores/" + data.testScoresRawFilename + "?tid=" + data.tid + "&format=raw");
            data.testFinalSubmissionsFilename = this.model.get("tid") + "_final_submissions.csv";
            data.testFinalSubmissionsLink = this.appModel.apiURL("testFinalSubmissions/" + data.testFinalSubmissionsFilename + "?tid=" + data.tid);
            data.testAllSubmissionsFilename = this.model.get("tid") + "_all_submissions.csv";
            data.testAllSubmissionsLink = this.appModel.apiURL("testAllSubmissions/" + data.testAllSubmissionsFilename + "?tid=" + data.tid);
            data.testFilesZipFilename = this.model.get("tid") + "_files.zip";
            data.testFilesZipLink = this.appModel.apiURL("testFilesZip/" + data.testFilesZipFilename + "?tid=" + data.tid);

            data.seeTestStats = this.appModel.hasPermission("viewOtherUsers");
            data.testFilesStatsFilename = this.model.get("tid") + "_stats.csv";
            data.testFilesStatsLink = this.appModel.apiURL("testStatsCSV/" + data.testFilesStatsFilename + "?tid=" + data.tid);
            data.testFilesStatsByDayFilename = this.model.get("tid") + "_stats_by_day.csv";
            data.testFilesStatsByDayLink = this.appModel.apiURL("testStatsByDayCSV/" + data.testFilesStatsFilename + "?tid=" + data.tid);
            data.testFilesQStatsFilename = this.model.get("tid") + "_question_stats.csv";
            data.testFilesQStatsLink = this.appModel.apiURL("testQStatsCSV/" + data.testFilesQStatsFilename + "?tid=" + data.tid);

            data.hasTestStats = this.store.testStatsColl.get(tid) && this.store.testStatsColl.get(tid).has("count");
            if (data.hasTestStats) {
                var testStats = this.store.testStatsColl.get(tid);
                data.count = testStats.get("count");
                data.hist = testStats.get("hist");
                data.mean = (testStats.get("mean") * 100).toFixed(1);
                data.median = (testStats.get("median") * 100).toFixed(1);
                data.stddev = (testStats.get("stddev") * 100).toFixed(1);
                data.min = (testStats.get("min") * 100).toFixed(1);
                data.max = (testStats.get("max") * 100).toFixed(1);
                data.nZeroScore = testStats.get("nZeroScore");
                data.nFullScore = testStats.get("nFullScore");
                data.fracZeroScore = (data.count > 0) ? (data.nZeroScore / data.count * 100).toFixed(1) : 0;
                data.fracFullScore = (data.count > 0) ? (data.nFullScore / data.count * 100).toFixed(1) : 0;
                if (testStats.has("statsByDay")) {
                    data.hasStatsByDay = true;
                    data.statsByDay = testStats.get("statsByDay");
                }

                var byQID = testStats.get("byQID");
                data.qStats = [];

                var pbar = function(val) {
                    val = Math.round(val);
                    if (val >= 50) {
                        return '<div class="progress" style="min-width: 7em">'
                            + '<div class="progress-bar progress-bar-success" style="width: ' + val + '%">' + val + '%</div>'
                            + '<div class="progress-bar progress-bar-danger" style="width: ' + (100 - val) + '%"></div>'
                            + '</div>';
                    } else {
                        return '<div class="progress" style="min-width: 7em">'
                            + '<div class="progress-bar progress-bar-success" style="width: ' + val + '%"></div>'
                            + '<div class="progress-bar progress-bar-danger" style="width: ' + (100 - val) + '%">' + val + '%</div>'
                            + '</div>';
                    }
                };
                
                var pbar2 = function(val) {
                    val = Math.round(val);
                    if (val >= 50) {
                        return '<div class="progress" style="min-width: 7em">'
                            + '<div class="progress-bar progress-bar-primary" style="width: ' + val + '%">' + val + '%</div>'
                            + '<div class="progress-bar progress-bar-warning" style="width: ' + (100 - val) + '%"></div>'
                            + '</div>';
                    } else {
                        return '<div class="progress" style="min-width: 7em">'
                            + '<div class="progress-bar progress-bar-primary" style="width: ' + val + '%"></div>'
                            + '<div class="progress-bar progress-bar-warning" style="width: ' + (100 - val) + '%">' + val + '%</div>'
                            + '</div>';
                    }
                };
                
                _(byQID).each(function(stat, qid) {
                    var meanScoreByQuintile = _(stat.meanScoreByQuintile).map(function(s) {return s * 100;});
                    var meanScoreByQuintileStrings = _(meanScoreByQuintile).map(function(s) {return s.toFixed(1);});
                    if (!that.store.questions.get(qid)) return;
                    data.qStats.push({
                        qid: qid,
                        title: that.store.questions.get(qid).get("title"),
                        link: "#tq/" + tid + "/" + qid,
                        count: stat.count,
                        meanScore: stat.meanScore * 100,
                        meanScoreString: (stat.meanScore * 100).toFixed(0),
                        meanScoreBar: pbar(stat.meanScore * 100),
                        meanNAttempts: stat.meanNAttempts,
                        meanNAttemptsString: stat.meanNAttempts.toFixed(1),
                        fracEverCorrect: stat.fracEverCorrect * 100,
                        fracEverCorrectString: (stat.fracEverCorrect * 100).toFixed(0),
                        fracEverCorrectBar: pbar(stat.fracEverCorrect * 100),
                        discrimination: stat.discrimination * 100,
                        discriminationString: (stat.discrimination * 100).toFixed(0),
                        discriminationBar: pbar2(stat.discrimination * 100),
                        meanScoreByQuintile: meanScoreByQuintile,
                        meanScoreByQuintileStrings: meanScoreByQuintileStrings,
                        meanScoreByQuintileString: _(meanScoreByQuintileStrings).map(function(s) {return s + '%';}).join(', '),
                    });
                });
                data.qStats = _(data.qStats).sortBy('qid');
                _(data.qStats).each(function(stat, i) {
                    stat.number = i + 1;
                });
            }
            
            var html = Mustache.render(TestDetailViewTemplate, data);
            this.$el.html(html);

            if (data.hasTestStats) {
                this.renderScoreHistogram("#scoreHistogramPlot", data.hist, "score / %", "number of students");
                if (data.hasStatsByDay) {
                    that.renderStatsByDay("#statsByDayPlot", data.statsByDay);
                }
                this.renderQuestionScoreDiscPlot("#questionScoreDiscPlot", data.qStats);
                _(data.qStats).each(function(stat) {
                    that.renderScoresByQuintilePlot("#scoresByQuintile" + stat.qid, stat.meanScoreByQuintile);
                });
            }

            var TestDetailView = TestFactory.getClass(this.model.get("type"), "tDetailView");
            if (!TestDetailView)
                return;
            this.subView = new TestDetailView({model: this.model, appModel: this.appModel, test: this.test, questions: this.questions});
            this.listenTo(this.subView, "resetTest", this.resetTest.bind(this));
            this.listenTo(this.subView, "resetTestForAll", this.resetTestForAll.bind(this));
            this.subView.render();
            this.$("#tDetail").html(this.subView.el);
        },

        _resetSuccess: function(data, textStatus, jqXHR) {
            this.$("#actionResult").html('<div class="alert alert-success" role="alert">Successfully reset test.</div>');
            Backbone.trigger('reloadUserData');
        },
        
        _resetError: function(jqXHR, textStatus, errorThrown) {
            this.$("#actionResult").html('<div class="alert alert-danger" role="alert">Error resetting test.</div>');
            Backbone.trigger('reloadUserData');
        },
        
        resetTest: function() {
            this.$("#actionResult").html('');
            var that = this;
            this.$('#confirmResetTestModal').on('hidden.bs.modal', function (e) {
                var tid = that.model.get("tid");
                var userUID = that.appModel.get("userUID");
                $.ajax({
                    dataType: "json",
                    url: that.appModel.apiURL("tInstances?tid=" + tid + "&uid=" + userUID),
                    type: "DELETE",
                    processData: false,
                    contentType: 'application/json; charset=UTF-8',
                    success: that._resetSuccess.bind(that),
                    error: that._resetError.bind(that),
                });
            });
            this.$("#confirmResetTestModal").modal('hide');
        },

        resetTestForAll: function() {
            this.$("#actionResult").html('');
            var that = this;
            this.$('#confirmResetTestForAllModal').on('hidden.bs.modal', function (e) {
                var tid = that.model.get("tid");
                $.ajax({
                    dataType: "json",
                    url: that.appModel.apiURL("tInstances?tid=" + tid),
                    type: "DELETE",
                    processData: false,
                    contentType: 'application/json; charset=UTF-8',
                    success: that._resetSuccess.bind(that),
                    error: that._resetError.bind(that),
                });
            });
            this.$("#confirmResetTestForAllModal").modal('hide');
        },

        _finishSuccess: function(data, textStatus, jqXHR) {
            if (data.tiidsClosed.length == 0) {
                this.$("#actionResult").html('<div class="alert alert-success" role="alert">All tests were already finished.</div>');
            } else {
                this.$("#actionResult").html('<div class="alert alert-success" role="alert">Successfully finished all open tests. Number of tests finished: ' + data.tiidsClosed.length + '</div>');
            }
            Backbone.trigger('reloadUserData');
        },
        
        _finishError: function(jqXHR, textStatus, errorThrown) {
            this.$("#actionResult").html('<div class="alert alert-danger" role="alert">Error finishing tests.</div>');
            Backbone.trigger('reloadUserData');
        },
        
        finishTestForAll: function() {
            this.$("#actionResult").html('');
            var that = this;
            this.$('#confirmFinishTestForAllModal').on('hidden.bs.modal', function (e) {
                var tid = that.model.get("tid");
                var finish = {tid: tid};
                $.ajax({
                    dataType: "json",
                    url: that.appModel.apiURL("finishes"),
                    type: "POST",
                    processData: false,
                    data: JSON.stringify(finish),
                    contentType: 'application/json; charset=UTF-8',
                    success: that._finishSuccess.bind(that),
                    error: that._finishError.bind(that),
                });
            });
            this.$("#confirmFinishTestForAllModal").modal('hide');
        },

        reloadStats: function() {
            var tid = this.model.get("tid");
            this.store.reloadTestStatsForTID(tid);
        },

        close: function() {
            if (this.subView) {
                this.subView.close();
            }
            this.remove();
        },

        renderScoreHistogram: function(selector, hist, xlabel, ylabel) {
            var margin = {top: 10, right: 20, bottom: 55, left: 70},
                width = 600 - margin.left - margin.right,
                height = 371 - margin.top - margin.bottom;

            var x = d3.scale.linear()
                .domain([0, 100])
                .range([0, width]);

            var y = d3.scale.linear()
                .domain([0, d3.max(hist)])
                .nice()
                .range([height, 0]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .tickValues([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
                .orient("bottom");

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left");
            
            var xGrid = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .tickSize(-height)
                .tickFormat("");

            var yGrid = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickSize(-width)
                .tickFormat("");

            var svg = d3.select(this.$(selector).get(0)).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("class", "center-block statsPlot")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svg.append("g")
                .attr("class", "x grid")
                .attr("transform", "translate(0," + height + ")")
                .call(xGrid);

            svg.append("g")
                .attr("class", "y grid")
                .call(yGrid);

            svg.selectAll(".outlineBar")
                .data(hist) // .data(_.times(hist.length, _.constant(0)))
                .enter().append("rect")
                .attr("class", "outlineBar")
                .attr("x", function(d, i) {return x(i * 100 / hist.length);})
                .attr("y", function(d, i) {return y(d);})
                .attr("width", function(d, i) {return x((i + 1) * 100 / hist.length) - x(i * 100 / hist.length);})
                .attr("height", function(d, i) {return y(0) - y(d);});

            /*
            svg.selectAll(".outlineBar")
                .data(hist)
                .transition()
                .duration(3000)
                .attr("y", function(d, i) {return y(d);})
                .attr("height", function(d, i) {return y(0) - y(d);});
            */

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .append("text")
                .attr("class", "label")
                .attr("x", width / 2)
                .attr("y", "3em")
                .style("text-anchor", "middle")
                .text("score / %");

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr("class", "label")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", "-3em")
                .style("text-anchor", "middle")
                .text("number of students");

            svg.append("line")
                .attr({x1: 0, y1: 0, x2: width, y2: 0, "class": "x axis"})

            svg.append("line")
                .attr({x1: width, y1: 0, x2: width, y2: height, "class": "y axis"});
        },

        renderStatsByDay: function(selector, statsByDay) {
            var svgWidth = 600;
            var svgHeight = 371;
            var margin = {top: 10, right: 20, bottom: 30, left: 70},
                width = svgWidth - margin.left - margin.right,
                height = svgHeight - margin.top - margin.bottom;

            var dates = _.chain(statsByDay).keys().map(function(d) {return moment(d);}).value();
            if (dates.length == 0) return;
            var firstDate = _(dates).reduce(function(a, b) {return moment.min(a, b);}, dates[0]).format();
            var lastDate = _(dates).reduce(function(a, b) {return moment.max(a, b);}, dates[0]).format();

            var data = _.chain(statsByDay).pairs().map(function(d) {
                var d3Date = new Date(d[0]);
                return [d3Date, d[1]];
            }).value();

            var maxDensity = _.chain(statsByDay).values().pluck("densities").map(function(x) {return _.max(x);}).max().value();
            
            var x = d3.time.scale()
                .domain([d3.time.hour.offset(new Date(firstDate), -12),
                         d3.time.hour.offset(new Date(lastDate), 12)])
                .range([0, width]);

            var y = d3.scale.linear()
                .domain([0, 100])
                .range([height, 0]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .ticks(d3.time.day, 1)
                .tickFormat(d3.time.format("%-m/%d"))
                .orient("bottom");

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left");
            
            var xGrid = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .tickSize(-height)
                .tickFormat("");

            var yGrid = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickSize(-width)
                .tickFormat("");

            var svg = d3.select(this.$(selector).get(0)).append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight)
                .attr("class", "center-block statsPlot")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svg.append("g")
                .attr("class", "x grid")
                .attr("transform", "translate(0," + height + ")")
                .call(xGrid);

            svg.append("g")
                .attr("class", "y grid")
                .call(yGrid);

            svg.selectAll(".violinGroup")
                .data(data)
                .enter()
                .append("g")
                .attr("class", "violinGroup")
                .each(function(d, i) {
                    var side1 = _.zip(d[1].grid, d[1].densities);
                    var side2 = _.zip(d[1].grid, _(d[1].densities).map(function(d) {return -d;})).reverse();
                    var pathData = side1.concat(side2);
                    var violinLine = d3.svg.line()
                        .x(function(v) {return x(d3.time.minute.offset(d[0], 660 * v[1] / maxDensity));})
                        .y(function(v) {return y(v[0] * 100);})
                        .interpolate("linear");
                    d3.select(this)
                        .append("path")
                        .datum(pathData)
                        .attr("class", "violin")
                        .attr("d", violinLine);

                    var maxWidth = Math.max(30, 660 * _.max(d[1].densities) / maxDensity);
                    d3.select(this)
                        .append("line")
                        .attr("class", "violinMedian")
                        .attr("x1", function(d) {return x(d3.time.minute.offset(d[0], -maxWidth));})
                        .attr("x2", function(d) {return x(d3.time.minute.offset(d[0], +maxWidth));})
                        .attr("y1", function(d) {return y(d[1].median * 100);})
                        .attr("y2", function(d) {return y(d[1].median * 100);});
                });

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .append("text")

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr("class", "label")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", "-3em")
                .style("text-anchor", "middle")
                .text("score / %");

            svg.append("line")
                .attr({x1: 0, y1: 0, x2: width, y2: 0, "class": "x axis"})

            svg.append("line")
                .attr({x1: width, y1: 0, x2: width, y2: height, "class": "y axis"});
        },

        renderQuestionScoreDiscPlot: function(selector, qStats) {
            var margin = {top: 10, right: 20, bottom: 50, left: 70},
            width = 400 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

            var x = d3.scale.linear()
                .range([0, width]);

            var y = d3.scale.linear()
                .range([height, 0]);

            var color = d3.scale.category10();

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom");

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left");

            var xGrid = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .tickSize(-height)
                .tickFormat("");

            var yGrid = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickSize(-width)
                .tickFormat("");

            var svg = d3.select(this.$(selector).get(0)).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("class", "center-block statsPlot")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var xData = _(qStats).map(function(stat) {return stat.meanScore;});
            var yData = _(qStats).map(function(stat) {return stat.discrimination;});
            
            var xExtent = [0, 100]; //d3.extent(xData);
            var yExtent = [0, 100]; //d3.extent(yData);
            var xRange = xExtent[1] - xExtent[0];
            var yRange = yExtent[1] - yExtent[0];
            //xExtent = [xExtent[0] - 0.05 * xRange, xExtent[1] + 0.05 * xRange];
            //yExtent = [yExtent[0], yExtent[1] + 0.05 * yRange];
            x.domain(xExtent);
            y.domain(yExtent);

            svg.append("g")
                .attr("class", "x grid")
                .attr("transform", "translate(0," + height + ")")
                .call(xGrid);

            svg.append("g")
                .attr("class", "y grid")
                .call(yGrid);

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .append("text")
                .attr("class", "label")
                .attr("x", width / 2)
                .attr("y", "3em")
                .style("text-anchor", "middle")
                .text("mean score / %");

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr("class", "label")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", "-3em")
                .style("text-anchor", "middle")
                .text("discrimination / %");

            /*
            svg.append("g")
                .append("text")
                .attr("class", "label")
                .attr("x", width / 2)
                .attr("y", "-1em")
                .style("text-anchor", "middle")
                .text("Question discrimination versus mean score");
            */

            svg.append("line")
                .attr({x1: 0, y1: 0, x2: width, y2: 0, "class": "x axis"})

            svg.append("line")
                .attr({x1: width, y1: 0, x2: width, y2: height, "class": "y axis"});

            svg.selectAll(".point")
                .data(qStats)
                .enter().append("circle")
                .attr("class", "point")
                .attr("cx", function(stat) {return x(stat.meanScore);})
                .attr("cy", function(stat) {return y(stat.discrimination);})
                .attr("r", function(stat) {return 2;});

            svg.selectAll(".pointLabel")
                .data(qStats)
                .enter().append("text")
                .attr("class", "pointLabel")
                .style("text-anchor", "middle")
                .attr("x", function(stat) {return x(stat.meanScore);})
                .attr("y", function(stat) {return y(stat.discrimination) - 6;})
                .text(function(stat) {return stat.number;});
        },

        renderScoresByQuintilePlot: function(selector, hist) {
            var margin = {top: 1, right: 1, bottom: 1, left: 1},
            width = 100 - margin.left - margin.right,
                height = 40 - margin.top - margin.bottom;

            var x = d3.scale.ordinal()
                .domain(d3.range(hist.length))
                .rangeRoundBands([0, width], 0.2);

            var y = d3.scale.linear()
                .domain([0, 100])
                .range([height, 0]);

            var color = d3.scale.category10();

            var svg = d3.select(this.$(selector).get(0)).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("class", "center-block statsPlot")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svg.selectAll(".bar")
                .data(hist)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function(d, i) {return x(i);})
                .attr("y", function(d, i) {return y(d);})
                .attr("width", function(d, i) {return x.rangeBand();})
                .attr("height", function(d, i) {return y(0) - y(d);});

            svg.append("line")
                .attr({x1: 0, y1: 0, x2: width, y2: 0, "class": "x axis"})

            svg.append("line")
                .attr({x1: 0, y1: height, x2: width, y2: height, "class": "x axis"})
        },
    });

    return TestDetailView;
});
