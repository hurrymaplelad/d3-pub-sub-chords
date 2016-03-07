var _, channelChordLayout, color, d3;

_ = require('lodash');
color = require('color');
d3 = require('d3');

channelChordLayout = require('local_modules/channel_chord_layout');

angular.module(__filename, []).directive('pubSubGraph', ngInject(function() {
  return {
    scope: {
      chords: '='
    },
    link: function($scope, element) {
      var drawGraph;
      $scope.$watch('chords', function(chords) {
        return drawGraph(chords);
      });
      return drawGraph = function(chords) {
        var arc, chordGroup, colorScale, group, groupPath, groupText, groups, groupsByName, h, innerRadius, labeled, layout, numGroups, outerRadius, pad, path, svg, w;
        if (chords == null) {
          chords = [];
        }
        w = 800;
        h = 800;
        pad = 180;
        outerRadius = Math.min(w, h) / 2 - pad;
        innerRadius = outerRadius - 24;

        // Inspired by https://bost.ocks.org/mike/uberdata/
        arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);
        path = d3.svg.chord().radius(innerRadius);
        element[0].innerHTML = '';
        svg = d3.select(element[0]).append('svg:svg').attr('width', w).attr('height', h).append('svg:g').attr('transform', "translate(" + (w / 2) + ", " + (h / 2) + ")");
        svg.append("circle").attr("r", outerRadius).attr("id", "circle").style('fill', 'none');

        // Compute the chord layout
        layout = channelChordLayout().padding((function() {
          switch (chords.length) {
            case 1:
              return 1.1;
            case 2:
              return 0.5;
            case 3:
              return 0.2;
            default:
              return 0.05;
          }
        })()).chords(chords);
        groups = layout.groups();
        numGroups = groups.length;

        // Create a color scale
        colorScale = d3.scale.category10();
        groups.forEach(function(group, i) {
          return group.color = colorScale(i);
        });
        groupsByName = _.indexBy(groups, 'name');
        group = svg.selectAll(".group").data(layout.groups).enter().append("g").attr("class", "group");

        // Add the group arc
        groupPath = group.append("path").attr("id", function(d, i) {
          return "group" + i;
        }).attr("d", arc).style("fill", function(d) {
          return groupsByName[d.name].color;
        // Mouseover groups to hide unrelated chords
        }).on("mouseover", function(d) {
          return chordGroup.classed("pub-sub-graph-hidden", function(p) {
            return p.source.name !== d.name && p.target.name !== d.name;
          });

        // Flip text on the bottom
        // http://www.visualcinnamon.com/2015/09/placing-text-on-arcs.html
        }).each(function(d, i) {
          var centralAngle, endLoc, firstArcSection, middleLoc, middleSec, newArc, newEnd, newStart, ref, ref1, ref2, startLoc;
          // Search pattern for everything between the start and the first capital L
          firstArcSection = /(^.+?)L/;

          // Grab everything up to the first Line statement
          newArc = firstArcSection.exec(d3.select(this).attr("d"))[1];
          // Replace all the comma's so that IE can handle it
          newArc = newArc.replace(/,/g, " ");

          // If the end angle lies beyond a quarter of a circle (90 degrees or pi/2)
          // flip the end and start position
          centralAngle = (d.startAngle + d.endAngle) / 2;
          if (centralAngle > Math.PI / 2 && centralAngle < Math.PI * 3 / 2) {
            d.flipped = true;
            startLoc = /M(.*?)A/;
            middleLoc = /A(.*?)0 0 1/;
            endLoc = /0 0 1 (.*?)$/;

            // Flip the direction of the arc by switching the start en end point (and sweep flag)
            // of those elements that are below the horizontal line
            newStart = (ref = endLoc.exec(newArc)) != null ? ref[1] : void 0;
            newEnd = (ref1 = startLoc.exec(newArc)) != null ? ref1[1] : void 0;
            middleSec = (ref2 = middleLoc.exec(newArc)) != null ? ref2[1] : void 0;

            // Build up the new arc notation, set the sweep-flag to 0
            newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
          }
          // Create a new invisible arc that the text can flow along
          group.append("path").attr("class", "hiddenDonutArcs").attr("id", "donutArc" + i).attr("d", newArc).style("fill", "none");
        });

        // Add a text label
        groupText = group.append("text").attr("dy", function(d) {
          return d.flipped && -8 || 15;
        }).attr("text-anchor", "middle").append("textPath").attr("startOffset", "50%").attr("xlink:href", function(d, i) {
          return "#donutArc" + i;
        }).text(function(d) {
          return d.name;
        });

        // Add the chords
        chordGroup = svg.selectAll(".chord-group").data(layout.chords).enter().append("g").attr("class", "chord-group");
        chordGroup.append("path").attr("id", function(d, i) {
          return "chord" + i;
        }).style("fill", function(d) {
          var ref, ref1, ref2;
          return color((ref = (ref1 = groupsByName[(ref2 = d.source) != null ? ref2.name : void 0]) != null ? ref1.color : void 0) != null ? ref : 'grey').lighten(0.5).darken(0.1).rgbString();
        }).attr("d", path);
        labeled = {};
        return chordGroup.append("text").attr("text-anchor", "start").attr("transform", function(d) {
          var angle, deg, scale, x, y;
          angle = (d.source.startAngle + d.source.endAngle) / 2;
          angle -= Math.PI / 2;
          if (angle > Math.PI / 2) {
            d.flipped = true;
            angle = angle - Math.PI;
          }
          scale = d.flipped && -1 || 1;
          pad = 10;
          x = (outerRadius + pad) * Math.cos(angle) * scale;
          y = (outerRadius + pad) * Math.sin(angle) * scale;
          deg = angle / (2 * Math.PI) * 360;
          return "translate(" + x + "," + y + ") rotate(" + deg + ")";
        }).attr("text-anchor", function(d) {
          return d.flipped && "end" || "start";
        }).text(function(d) {
          return d.flipped && (d.name + " ▶") || ("◀ " + d.name);
        });
      };
    }
  };
}));

module.exports = __filename;
