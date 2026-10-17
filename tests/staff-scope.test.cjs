const {test} = require('node:test');
const assert = require('node:assert/strict');
const scope = require('../js/staff-scope.js');
const zones = [{id:'zone-a',name:'الألبان'},{id:'zone-b',name:'المشروبات'}];
test('zone scope requires an explicit supported contract and active valid zones', () => {
  assert.throws(() => scope.options({data:zones}));
  assert.throws(() => scope.options({data:{contractVersion:1,supportsZoneScope:false,zones}}));
  assert.deepEqual(scope.options({data:{contractVersion:1,supportsZoneScope:true,zones:[...zones,zones[0],{id:'off',name:'معطل',isActive:false}]}}), zones);
  assert.throws(() => scope.payload('Zones',['zone-a'],zones,false));
  assert.throws(() => scope.payload('Zones',[],zones,true));
  assert.throws(() => scope.payload('Zones',['foreign'],zones,true));
  assert.throws(() => scope.payload('Unknown',[],zones,true));
  assert.deepEqual(scope.payload('Zones',['zone-a','zone-a'],zones,true),{accessScope:'Zones',zoneIds:['zone-a']});
  assert.deepEqual(scope.payload('Store',['zone-a'],zones,true),{accessScope:'Store',zoneIds:[]});
  assert.deepEqual(scope.payload('Store',[],zones,false),{});
});
test('HTTP success alone cannot confirm a zone assignment or broaden it silently', () => {
  const expected={accessScope:'Zones',zoneIds:['zone-a','zone-b']};
  assert.equal(scope.confirmed({success:true,data:{id:'employee'}},expected),false);
  assert.equal(scope.confirmed({data:{accessScope:'Store',zoneIds:[]}},expected),false);
  assert.equal(scope.confirmed({data:{accessScope:'Zones',zoneIds:['zone-a']}},expected),false);
  assert.equal(scope.confirmed({data:{accessScope:'Zones',zoneIds:['zone-b','zone-a']}},expected),true);
});
