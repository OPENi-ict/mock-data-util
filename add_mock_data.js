/**
 * Created by dconway on 13/05/15.
 */
'use strict';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var supertest = require('supertest-as-promised');
var request   = supertest('https://dev.openi-ict.eu');
var assert    = require('chai').assert;
var profiles  = require('./data/mock_profiles_array.json')
var location  = require('./data/mock_location_label_array.json')


var api_key = "a3361a7b4f3d1f127b9d9bec15bfb695"
var secret  = "63394b367e65f74d028e32f3f9aac75c8747c5c8ba42aec3a3c18873e9a16ea6"

var profile_type_id  = "t_bd7d5d80c2cec56296c1fe8895e52114-710"
var location_type_id = "t_ca3fae489fc9d2d580547a4f4fa0871c-374"

var permissions

var profile_type  = {
   "@reference": "Mock Profile",
   "@context": [
      {
         "@property_name": "first_name",
         "@openi_type": "string",
         "@multiple": false,
         "@required": true,
         "@context_id": "first_name"
      },
      {
         "@property_name": "last_name",
         "@openi_type": "string",
         "@multiple": false,
         "@required": true,
         "@context_id": "last_name"
      },
      {
         "@property_name": "email",
         "@openi_type": "string",
         "@multiple": false,
         "@required": true,
         "@context_id": "email"
      },
      {
         "@property_name": "city",
         "@openi_type": "string",
         "@multiple": false,
         "@required": true,
         "@context_id": "city"
      },
      {
         "@property_name": "country",
         "@openi_type": "string",
         "@multiple": false,
         "@required": true,
         "@context_id": "country"
      },
      {
         "@property_name": "employer",
         "@openi_type": "string",
         "@multiple": false,
         "@required": true,
         "@context_id": "employer"
      }
   ]
}

var location_type = {
   "@reference": "Mock Location Object",
   "@context": [
      {
         "@property_name": "label",
         "@openi_type": "string",
         "@multiple": false,
         "@required": true,
         "@context_id": "label"
      },
      {
         "@property_name": "lat",
         "@openi_type": "float",
         "@multiple": false,
         "@required": true,
         "@context_id": "latitude "
      },
      {
         "@property_name": "long",
         "@openi_type": "float",
         "@multiple": false,
         "@required": true,
         "@context_id": "Longitude"
      }
   ]
}




var create_location_obj = function(loc, token){

   var location_obj = {
      "@openi_type" : location_type_id,
      "@data"       : {
         "label" : loc.label,
         "lat"   : loc.lat,
         "long"  : loc.long
      }
   }

   it('Should persist Location Object ' + loc["label"], function () {
      this.timeout(10000);
      return request.post('/api/v1/objects')
         .send(location_obj)
         .set('Accept', 'application/json')
         .set('Authorization', token)
         .expect('content-type', 'application/json; charset=utf-8')
         .expect(function (response) {
            var body = JSON.parse(response.text);
            assert(body["@id"] !== undefined, "Object ID Should be returned");
         })

   })
}


var create_user_auth_and_create_objs = function(p, user, i){

   var token

   it('should create the user ' + p["email"], function () {
      this.timeout(10000);
      return request.post('/api/v1/auth/users')
         .send(user)
         .set('Accept', 'application/json')
         .expect('content-type', 'application/json; charset=utf-8')
   });

   it('should authorize ' + p["email"], function () {
      this.timeout(10000);

      return request.post('/api/v1/auth/authorizations')
         .send({
            "username": user.username,
            "password": user.password,
            api_key   : api_key,
            secret    : secret
         })
         .set('Accept', 'application/json')
         //.expect('content-type', 'application/json; charset=utf-8')
         .expect(function (response) {
            var body = JSON.parse(response.text);
            assert(body["session"] !== undefined, 'Authorization session should be returned');
            token = body["session"];
         });
   });

   //var path = "/api/v1/app_permissions_latest/" + req.query.api_key;

   var setPermissions = function(per){

      for (var i = 0; i < per.permissions.length; i++){
         var perm = per.permissions[i]

         if ('service_enabler' === perm.type){

            for (var j =0; j < per.service_enablers.length; j++){
               var se = per.service_enablers[j]

               if (se.name === perm.ref){
                  per.permissions[i].cloudlet = se.cloudlet
               }
            }
         }
      }

      permissions = per.permissions
   }


   it('Should get latest app permissions ' + api_key, function () {
      return request.get("/api/v1/app_permissions_latest/" + api_key)
         .set('Accept', 'application/json')
         .set('Authorization', token)
         //.expect('content-type', 'application/json; charset=utf-8')
         .expect(function (response) {
            var body = JSON.parse(response.text);
            setPermissions(body.result[0])
         })
   })


   //return

   it('Should persist user permissions ' + p["email"], function () {

      //console.log(permissions)


      return request.post('/api/v1/permissions')
         .send(permissions)
         .set('Accept', 'application/json')
         .set('Authorization', token)
         //.expect('content-type', 'application/json; charset=utf-8')
         .expect(function (response) {
            var body = JSON.parse(response.text);

            if (body instanceof Array){
               for (var k=0; k < body.length; k++){
                  assert(body[k]["status"] === 'update', 'Permission status should be {"status":"update"} but was:\n\t' + JSON.stringify(body[k]))
               }
            }
            else {
               assert(body["status"] === 'update', 'Permission status should be {"status":"update"} but was:\n\t' + JSON.stringify(body))
            }
         })
   })


   it('Should persist profile Object ' + p["email"], function () {

      var prof = {
         "@openi_type" : profile_type_id,
         "@data"       : {
            "first_name" : p.first_name,
            "last_name"  : p.last_name,
            "email"      : p.email,
            "city"       : p.city,
            "country"    : p.country,
            "employer"   : p.employer
         }
      }

      this.timeout(10000);
      return request.post('/api/v1/objects')
         .send(prof)
         .set('Accept', 'application/json')
         .set('Authorization', token)
         .expect('content-type', 'application/json; charset=utf-8')
         .expect(function (response) {
            var body = JSON.parse(response.text);
            //console.log(body)
            assert(body["@id"] !== undefined, "Object ID Should be returned");

         })
   })


      for (var j = 10*i; j < 10*i + 10; j++) {

         var loc = location[j]

         if (undefined === loc){
            continue
         }

         var location_obj = {
            "@openi_type": location_type_id,
            "@data"      : {
               "label": loc.label,
               "lat"  : loc.lat,
               "long" : loc.long
            }
         }

         it('Should persist Location Object ' + loc["label"], function (obj) {
            return function () {
               this.timeout(10000);
               return request.post('/api/v1/objects')
                  .send(obj)
                  .set('Accept', 'application/json')
                  .set('Authorization', token)
                  .expect('content-type', 'application/json; charset=utf-8')
                  .expect(function (response) {
                     var body = JSON.parse(response.text);
                     assert(body["@id"] !== undefined, "Object ID Should be returned");
                  })
            }

         }(location_obj))
      }

}


describe('Create Profiles', function () {
   //for (var i = 0; i < 1; i++) {
   for (var i = 0; i < profiles.length; i++) {
      var p      = profiles[i]
      var user   = {username:p["email"], password:p["email"]}

      create_user_auth_and_create_objs(p, user, i)
   }
})
