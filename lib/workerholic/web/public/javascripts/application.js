var App = {
  queuedJobsCountHistory: [],
  failedJobsCountHistory: [],
  jobsCompletedHistory: [],
  jobsCompletedPerSecondHistory: [],
  totalMemoryHistory: [],
  maxTime: 1000,
  pollingInterval: 10,
  chartFont: 'arial',
  freshDataCount: function() {
    return (this.maxTime / (this.pollingInterval) ) + 1;
  },
  tab: null,
  removeStaleData: function() {
    if (this.queuedJobsCountHistory.length > this.freshDataCount) {
      this.queuedJobsCountHistory.pop();
      this.failedJobsCountHistory.pop();
      this.jobsCompletedHistory.pop();
      this.totalMemoryHistory.pop();
    }
  },
  getUrlParameter: function(param) {
    var pageUrl = decodeURIComponent(window.location.search.substring(1));
    var urlVariables = pageUrl.split('&')
    var parameterName;

    for (var i = 0; i < urlVariables.length; i++) {
      parameterName = urlVariables[i].split('=');

      if (parameterName[0] === param) {
        return parameterName[1] === undefined ? true : parameterName[1];
      }
    }
  },
  getOverviewData: function() {
    $.ajax({
      url: 'overview-data',
      context: this,
      success: function(data) {
        var deserializedData = JSON.parse(data);
        var scheduledJobsCount = deserializedData.scheduled_jobs;

        var completedJobs = deserializedData.completed_jobs.reduce(function(sum, subArray) {
          return sum + subArray[1];
        }, 0);

        var failedJobsCount= deserializedData.failed_jobs.reduce(function(sum, subArray) {
          return sum + subArray[1];
        }, 0);

        var queuedJobs = deserializedData.queued_jobs;

        var queuedJobsCount = queuedJobs.reduce(function(sum, queue) {
          return sum + queue[1];
        }, 0);

        var memoryUsage = deserializedData.memory_usage;
        var totalMemoryUsage = 0;

        $('.removable').remove();

        for (id in memoryUsage) {
          totalMemoryUsage = totalMemoryUsage + parseInt(memoryUsage[id]);
          $('.nested').last().after("<tr class='nested removable'><td>" + id + "</td><td id='process_" + id + "'" + "class='process_memory'" + ">" + memoryUsage[id] / 1000 + ' MB' + "</td></tr>")
        }

        this.queuedJobsCountHistory.unshift(queuedJobsCount);
        this.failedJobsCountHistory.unshift(failedJobsCount);
        this.jobsCompletedHistory.unshift(completedJobs);
        this.totalMemoryHistory.unshift(totalMemoryUsage / 1000);

        for (var i = 0; i < this.freshDataCount(); i++) {
          this.jobsCompletedPerSecondHistory[i] = (parseInt(deserializedData.completed_jobs_per_second[i]) / 10 || 0);
        }

        this.removeStaleData();
        this.drawChart();

        $('.completed_jobs').text(completedJobs);
        $('.failed_jobs').text(failedJobsCount);
        $('.queue_count').text(queuedJobs.length);
        $('.queued_jobs_count').text(queuedJobsCount);
        $('.scheduled_jobs').text(scheduledJobsCount);
        $('.memory_usage').text(totalMemoryUsage / 1000 + ' MB');
      }
    });
  },
  getQueueData: function() {
    $.ajax({
      url: 'queues-data',
      success: function(data) {
        var deserializedData = JSON.parse(data);
        var queuedJobs = deserializedData.queued_jobs;
        var total = 0;

        for (var i = 0; i < queuedJobs.length; i++) {
          $('#queue_name_' + queuedJobs[i][0].split(':').pop()).text(queuedJobs[i][0]);
          $('#queue_count_' + queuedJobs[i][0].split(':').pop()).text(queuedJobs[i][1]);
          total = total + queuedJobs[i][1];
        }

        $('#queue_total').text(total);
      }
    });
  },
  getDetailData: function() {
    $.ajax({
      url: 'details-data',
      success: function(data) {
        var deserializedData = JSON.parse(data);
        var completedJobs = deserializedData.completed_jobs;
        var failedJobs = deserializedData.failed_jobs;
        var completedTotal = 0;
        var failedTotal = 0;

        completedJobs.forEach(function(job) {
          $('#completed_' + job[0]).text(job[1]);
          completedTotal = completedTotal + job[1];
        });

        failedJobs.forEach(function(job) {
          $('#failed_' + job[0]).text(job[1]);
          failedTotal = failedTotal + job[1];
        });

        $('#failed_total').text(failedTotal);
        $('#completed_total').text(completedTotal);
      }
    })
  },
  getHistoryData: function() {
    var className = $('#class_selector select').find(':selected').val();
    var days = this.getUrlParameter('days') || 7;

    $('#button_' + days).addClass('is-dark');

    $('#class_selector').on('change', function(e) {
      location = window.location.origin + window.location.pathname + '?days=' + days + '&class=' + e.target.value;
    });

    $('#day_tabs a').on('click', function(e) {
      e.preventDefault();
      location = window.location.origin + window.location.pathname + '?days=' + $(e.target).attr('data-day') + '&class=' + className;
    });

    $.ajax({
      url: 'historic-data',
      data: {
        days: days,
        className: className,
      },
      dataType: 'json',
      success: function(data) {
        this.drawHistoryChart(days, className, data['completed_jobs'], data['failed_jobs']);
      }.bind(this)
    })
  },
  getHistoricalOverviewData: function() {
    $.ajax({
      url: 'overview-data-on-load',
      dataType: 'json',
      success: function(data) {
        for (var i = 0; i < this.freshDataCount(); i++) {
          this.jobsCompletedPerSecondHistory[i] = (parseInt(data['completed_jobs'][i]) / 10 || 0);
        }

        for (var i = 0; i < this.freshDataCount(); i++) {
          this.failedJobsCountHistory.push(parseInt(data['failed_jobs'][i]) || 0);
        }

        for (var i = 0; i < this.freshDataCount(); i++) {
          this.queuedJobsCountHistory.push(0);
        }

        for (var i = 0; i < this.freshDataCount(); i++) {
          this.totalMemoryHistory.push(0);
        }

        this.drawChart();
      }.bind(this)
    })
  },
  drawChart: function() {
    var processedJobsChart = new CanvasJS.Chart('jobs_processed_container', {
      title: {
        text: 'Jobs Processed per second',
        fontFamily: 'Arial',
        fontSize: 24,
      },
      axisX: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        reversed: true,
        gridColor: 'Silver',
        tickColor: 'silver',
        animationEnabled: true,
        title: 'Time ago (s)',
        maximum: this.maxTime
      },
      toolTip: {
        shared: true
      },
      theme: "theme2",
      axisY: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        gridColor: "Silver",
        tickColor: "silver",
        title: 'Jobs per second',
      },
      data: [{
        type: "line",
        showInLegend: false,
        name: "Jobs completed",
        color: "blue",
        markerType: 'circle',
        lineThickness: 6,
        dataPoints: this.setDataPoints(this.jobsCompletedPerSecondHistory, this.freshDataCount()),
      }]
    });

    var queuedJobsChart = new CanvasJS.Chart('queued_jobs_container', {
      title: {
        text: 'Queued Jobs',
        fontFamily: 'Arial',
        fontSize: 24,
      },
      axisX: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        reversed: true,
        gridColor: 'Silver',
        tickColor: 'silver',
        animationEnabled: true,
        title: 'Time ago (s)',
        // minimum: 0,
        maximum: this.maxTime,
      },
      toolTip: {
        shared: true
      },
      theme: "theme2",
      axisY: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        gridColor: "Silver",
        tickColor: "silver",
        title: 'Jobs'
      },
      data: [{
        type: "line",
        showInLegend: false,
        lineThickness: 6,
        name: "Queued Jobs",
        markerType: "circle",
        color: "#F08080",
        dataPoints: this.setDataPoints(this.queuedJobsCountHistory, this.freshDataCount()),
      }],
    });

    var failedJobsChart = new CanvasJS.Chart('failed_jobs_container', {
      title: {
        text: 'Failed Jobs',
        fontFamily: 'Arial',
        fontSize: 24,
      },
      axisX: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        reversed: true,
        gridColor: 'Silver',
        tickColor: 'silver',
        animationEnabled: true,
        title: 'Time ago (s)',
        // minimum: 0,
        maximum: this.maxTime,
      },
      toolTip: {
        shared: true
      },
      theme: "theme2",
      axisY: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        gridColor: "Silver",
        tickColor: "silver",
        title: 'Jobs'
      },
      data: [{
          type: "line",
          showInLegend: false,
          name: "Failed Jobs",
          color: "#20B2AA",
          markerType: 'circle',
          lineThickness: 6,
          dataPoints: this.setDataPoints(this.failedJobsCountHistory, this.freshDataCount()),
        },
      ]
    });

    var totalMemoryChart = new CanvasJS.Chart('total_memory_container', {
      title: {
        text: 'Memory Usage',
        fontFamily: 'Arial',
        fontSize: 24,
      },
      axisX: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        reversed: true,
        gridColor: 'Silver',
        tickColor: 'silver',
        animationEnabled: true,
        title: 'Time ago (s)',
        // minimum: 0,
        maximum: this.maxTime
      },
      toolTip: {
        shared: true
      },
      theme: "theme2",
      axisY: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        gridColor: "Silver",
        tickColor: "silver",
        title: 'Memory (mb)'
      },
      data: [{
        type: "line",
        showInLegend: false,
        name: "Memory usage",
        color: "#20B2AA",
        markerType: 'circle',
        lineThickness: 6,
        dataPoints: this.setDataPoints(this.totalMemoryHistory, this.freshDataCount()),
      }],
    });

    queuedJobsChart.render();
    failedJobsChart.render();
    processedJobsChart.render();
    totalMemoryChart.render();
  },
  drawHistoryChart: function(days, className, completed_jobs, failed_jobs) {
    var completedHistoryChart = new CanvasJS.Chart('history_container_completed', {
      title: {
        text: 'Completed History for ' + days + ' days',
        fontFamily: 'Arial',
        fontSize: 24,
      },
      axisX: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        gridColor: 'Silver',
        tickColor: 'silver',
        animationEnabled: true,
        title: 'Date',
        minimum: parseInt((completed_jobs['date_ranges'][days]) * 1000),
      },
      toolTip: {
        shared: true
      },
      theme: "theme2",
      axisY: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        gridColor: "Silver",
        tickColor: "silver",
        title: 'Jobs'
      },
      data: [{
        type: "line",
        showInLegend: false,
        name: "Completed Job for " + className,
        color: "#20B2AA",
        markerType: 'circle',
        lineThickness: 2,
        xValueType: 'dateTime',
        dataPoints: this.setHistoryDataPoints(completed_jobs),
      }],
    });

    var failedHistoryChart = new CanvasJS.Chart('history_container_failed', {
      title: {
        text: 'Failed History for ' + days + ' days',
        fontFamily: 'Arial',
        fontSize: 24,
      },
      axisX: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        gridColor: 'Silver',
        tickColor: 'silver',
        animationEnabled: true,
        title: 'Date',
        minimum: parseInt((completed_jobs['date_ranges'][days]) * 1000),
      },
      toolTip: {
        shared: true
      },
      theme: "theme2",
      axisY: {
        labelFontFamily: this.chartFont,
        titleFontFamily: this.chartFont,
        gridColor: "Silver",
        tickColor: "silver",
        title: 'Jobs'
      },
      data: [{
        type: "line",
        showInLegend: false,
        name: "Failed Jobs for " + className,
        color: "#20B2AA",
        markerType: 'circle',
        lineThickness: 2,
        xValueType: 'dateTime',
        dataPoints: this.setHistoryDataPoints(failed_jobs),
      }],
    });

    completedHistoryChart.render();
    failedHistoryChart.render();
  },
  setHistoryDataPoints: function(jobs) {
    data = []

    for (var i = 0; i <= jobs['date_ranges'].length; i++) {
      var point = { x: this.getLocalDate(parseInt(jobs['date_ranges'][i])).getTime(), y: jobs['job_counts'][i]};

      data.push(point);
    }

    return data;
  },
  setDataPoints: function(array, count) {
    var data = [];

    for (var i = 0; i <= count; i++) {
      var point = { x: (i * this.pollingInterval).toString(), y: array[i] };
      data.push(point);
    }

    return data;
  },
  getLocalDate: function(seconds) {
    var date = new Date(seconds * 1000);
    var day = date.getUTCDate();
    var month = date.getUTCMonth();
    var year = date.getUTCFullYear();

    return new Date(year, month, day);
  },
  setActiveTab: function() {
    this.tab = $(location).attr('href').match(/(?:(?!\?).)*/)[0].split('/').pop();
    var $active = $('a[href=' + this.tab + ']');

    $active.addClass('is-active');
  },
  pollData: function(tab) {
    if (tab === 'overview') {
      this.getHistoricalOverviewData();
      this.getOverviewData();

      setInterval(function() {
        this.getOverviewData();
      }.bind(this), this.pollingInterval * 1000);
    }

    if (tab === 'queues') {
      setInterval(function() {
        this.getQueueData();
      }.bind(this), this.pollingInterval * 1000);
    }

    if (tab === 'details') {
      setInterval(function() {
        this.getDetailData();
      }.bind(this), this.pollingInterval * 1000);
    }

    if (tab === 'history') {
      this.getHistoryData();
    }
  },
  bindEvents: function() {
    $('#memory_usage').on('click', function(e) {
      $('.nested th').toggle();
      $('.nested td').toggle();
    });
  },
  init: function() {
    this.setActiveTab();
    this.bindEvents();
    this.pollData(this.tab);
  }
}

$(document).ready(App.init.bind(App));
