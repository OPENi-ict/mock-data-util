'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var supertest = require('supertest-as-promised')
var request   = supertest('https://dev.openi-ict.eu')
var inter_request   = supertest('https://dev.openi-ict.eu:8443')
var assert          = require('chai').assert
var profiles        = require('./data/mock_profiles_array.json')
var context         = require('./data/mock_contexts_array.json')

var api_key = "33d2cb8514589acf595321a9217182cb"
var secret  = "3e8d82d909b1c5f33dfea1f7e8e3f977ac7c01c2c8c10912313f4a5194b5c115"

var profile_type_id  = "t_0089629cf3a842e5450f24cd0f5a5adf-744"
//var context_type_id  = "t_6a8dcdb4929dfc485220e07a4746f517-20049"
var context_type_id  = "t_1b9325069fd28e2a173716e760f8fb11-19921"

var permissions

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
        return inter_request.get("/api/v1/app_permissions_latest/" + api_key)
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

        return inter_request.post('/api/v1/permissions/' + api_key)
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


    //for (var j = 10*i; j < 10*i + 10; j++) {

        var con = context[i]

        if (undefined === con){
            return //continue
        }

        var context_obj = {
            "@openi_type": context_type_id,
            "@data"      : con
        }

        it('Should persist Context Object ... ' + context_obj["@data"]["id"], function (obj) {
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

        }(context_obj))

    //}

}


describe('Create Profiles', function () {
    profiles.forEach(function (p, i) {
        var user = { username:p["email"], password:p["email"] }
        create_user_auth_and_create_objs(p, user, i)
    })
})
