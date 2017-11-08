/**
 *  Store data for the current state of the course entitlement
 */
(function(define) {
    'use strict';

    define([
        'backbone'
    ],
        function(Backbone) {
            return Backbone.Model.extend({
                defaults: {
                    currentSessionId: '',
                }
            });
        }
    );
}).call(this, define || RequireJS.define);
