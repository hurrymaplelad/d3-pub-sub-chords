// A d3 layout derived from
// https://github.com/mbostock/d3/wiki/Chord-Layout
// supporting multiple named links between the same nodes
// configured with a list of chords: [{source: 'a', target: 'b', value: 3}]

d3 = require('d3');
_ = require('lodash');

var _, channelChordLayout, d3;

module.exports = channelChordLayout = function() {
  var chords, groups, groupsByName, layout, numGroups, padding, relayout, sortChords, sortGroups;
  layout = {};
  chords = void 0;
  groups = void 0;
  groupsByName = {};
  numGroups = void 0;
  padding = 0;
  sortGroups = void 0;
  sortChords = void 0;
  relayout = function() {
    var aboveMinGroups, angle, connectionSweep, connectionsPerGroup, groupNames, groupRadiansAvailable, minConnectionSize, minSweep, mindex, numConnections, numConnectionsAboveMin;
    groupNames = _.union(_.map(chords, 'target.name'), _.map(chords, 'source.name'));
    groups = groupNames.map(function(name) {
      return {
        name: name,
        value: 0,
        chords: [],
        connections: []
      };
    });
    groupsByName = _.indexBy(groups, 'name');

    // Assign chords to groups
    chords.forEach(function(chord) {
      return groupsByName[chord.source.name].chords.push(chord);
    });
    chords.forEach(function(chord) {
      return groupsByName[chord.target.name].chords.push(chord);
    });

    // Count unique connections on chords and groups
    chords.forEach(function(chord, i) {
      var ref, ref1, sourceGroup, targetGroup;
      sourceGroup = groupsByName[chord.source.name];
      targetGroup = groupsByName[chord.target.name];
      _.extend(chord, {
        connections: {
          source: "s|" + sourceGroup.name + "|" + ((ref = chord.name) != null ? ref : i),
          target: "t|" + targetGroup.name + "|" + ((ref1 = chord.name) != null ? ref1 : i)
        }
      });
      sourceGroup.connections.push(chord.connections.source);
      return targetGroup.connections.push(chord.connections.target);
    });
    groups.forEach(function(group) {
      return group.connections = _.uniq(group.connections);
    });

    // Sort groups
    if (sortGroups) {
      groups.sort(sortGroups);
    }

    // Sort subgroups to minimize crossing chords within the group
    groupNames = _.map(groups, 'name')
    groupNames = _.map(groups, 'name');
    groups.forEach(function(group) {
      return group.chords = _.sortBy(group.chords, function(chord) {
        var ccwDistance, cwDistance, ourIndex, si, theirIndex, ti;
        ti = groupNames.indexOf(chord.target.name);
        si = groupNames.indexOf(chord.source.name);
        ourIndex = chord.target.name === group.name && ti || si;
        theirIndex = chord.target.name === group.name && si || ti;
        cwDistance = theirIndex - ourIndex;
        if (cwDistance < 0) {
          cwDistance += groupNames.length;
        }
        ccwDistance = ourIndex - theirIndex;
        if (ccwDistance < 0) {
          ccwDistance += groupNames.length;
        }

        // Sort shortest counter clockwise distance first, then loopback, then longest clockwise
        if (ccwDistance <= cwDistance) {
          return ccwDistance - groupNames.length;
        } else {
          return groupNames.length - cwDistance;
        }
      });
    });
    numConnections = _.chain(chords.map(function(chord, i) {
      return _.values(chord.connections);
    })).flatten().uniq().value().length;

    // Divide the circle among groups. Groups with more connections get more space, but all
    // groups get at least a minimum sweep.
    minSweep = 0.5;
    if (minSweep * groups.length > 2 * Math.PI) {
      // Too many groups to apply minSweep.  Fuggedahboutit
      minSweep = 0;
    }
    connectionsPerGroup = groups.map(function(group) {
      return group.connections.length;
    }).sort();
    mindex = 0; // index of the largest group we've checked
    while (mindex < connectionsPerGroup.length) {
      aboveMinGroups = connectionsPerGroup.slice(mindex);
      numConnectionsAboveMin = _.sum(aboveMinGroups);
      groupRadiansAvailable = 2 * Math.PI - padding * groups.length - minSweep * mindex; // hold space for below min groups
      connectionSweep = groupRadiansAvailable / numConnectionsAboveMin;
      // Below this many connections, groups would use minSweep
      minConnectionSize = connectionsPerGroup[mindex];
      // Check if the smallest arc would fall below our min
      if (minConnectionSize * connectionSweep >= minSweep) {
        break;
      }
      mindex += 1;
    }

    // Support loopback connectionsCompute the start and end angle for each group and chord
    // by iterating around the circle
    angle = 0;
    groups.forEach(function(group) {
      var existingConnections, groupConnectionSweep;
      existingConnections = {};
      group.startAngle = angle;
      groupConnectionSweep = group.connections.length >= minConnectionSize ? connectionSweep : minSweep / group.connections.length;
      group.chords.forEach(function(chord) {
        var direction, endAngle, existingConnection, key, startAngle;
        direction = (chord.source.name === group.name) && 'source' || 'target';
        key = chord.connections[direction];
        existingConnection = existingConnections[key];
        // Support loopback connections
        if (existingConnection && chord.source.name === chord.target.name) {
          // Make sure the source gets wired up, even if this connection was
          // setup for an earlier chord.
          startAngle = existingConnection.startAngle, endAngle = existingConnection.endAngle;
          _.extend(chord[direction], {
            startAngle: startAngle,
            endAngle: endAngle
          });
          direction = 'target';
          key = chord.connections[direction];
          existingConnection = existingConnections[key];
        }
        if (existingConnection) {
          startAngle = existingConnection.startAngle, endAngle = existingConnection.endAngle;
        } else {
          startAngle = angle;
          endAngle = (angle += groupConnectionSweep);
          existingConnections[key] = {
            startAngle: startAngle,
            endAngle: endAngle
          };
        }
        return _.extend(chord[direction], {
          startAngle: startAngle,
          endAngle: endAngle
        });
      });
      group.endAngle = angle;
      return angle += padding;
    });
    if (sortChords) {
      return chords.sort(sortChords);
    }
  };
  layout.padding = function(radians) {
    if (!arguments.length) {
      return padding;
    }
    padding = radians;
    chords = groups = null;
    return layout;
  };
  layout.sortGroups = function(x) {
    if (!arguments.length) {
      return sortGroups;
    }
    sortGroups = x;
    chords = groups = null;
    return layout;
  };
  layout.sortChords = function(x) {
    if (!arguments.length) {
      return sortChords;
    }
    sortChords = x;
    if (chords) {
      relayout();
    }
    return layout;
  };
  layout.chords = function(newChords) {
    if (!newChords) {
      return chords;
    }
    groups = null;
    // Support {source: 'name', target: 'otherName'} shorthand
    chords = newChords.map(function(chord) {
      if (typeof chord.source === 'string') {
        chord.source = {
          name: chord.source
        };
      }
      if (typeof chord.target === 'string') {
        chord.target = {
          name: chord.target
        };
      }
      return chord;
    });
    relayout();
    return layout;
  };
  layout.groups = function() {
    if (!groups) {
      relayout();
    }
    return groups;
  };
  return layout;
};
