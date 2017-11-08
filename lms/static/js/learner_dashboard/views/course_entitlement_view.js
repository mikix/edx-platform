(function(define) {
    'use strict';

    define(['backbone',
        'jquery',
        'underscore',
        'gettext',
        'edx-ui-toolkit/js/utils/html-utils',
        'js/learner_dashboard/models/course_entitlement_model',
        'text!../../../templates/learner_dashboard/course_entitlement.underscore'
    ],
         function(
             Backbone,
             $,
             _,
             gettext,
             HtmlUtils,
             EntitlementModel,
             pageTpl
         ) {
             return Backbone.View.extend({
                 tpl: HtmlUtils.template(pageTpl),

                 events: {
                     'change .session-select': 'updateEnrollBtn',
                     'click .enroll-btn': 'handleEnrollChange',
                     'click .popover-dismiss': 'hideVerificationDialog',
                     'keydown .final-confirmation-btn': 'handleVerificationPopoverA11y'
                 },

                 initialize: function(options) {
                     this.$el = options.$el;
                     this.entitlementModel = new EntitlementModel({
                         availableSessions: this.formatDates(JSON.parse(options.availableSessions)),
                         entitlementUUID: options.entitlementUUID,
                         currentSessionId: options.currentSessionId,
                         userId: options.userId
                     });
                     this.listenTo(this.model, "change", this.render);

                     // Grab URLs that handle enrollment, unenrollment and changing of enrollment
                     this.enrollUrl = options.enrollUrl;

                     // Grab elements from the parent card that work with this view and bind associated events
                     this.$triggerOpenBtn = options.$triggerOpenBtn; // Opens and closes session selection view
                     this.$dateDisplayField = options.$dateDisplayField; // Displays current session dates
                     this.$enterCourseBtn = options.$enterCourseBtn; // Link to course home page
                     this.$triggerOpenBtn.on('click', this.toggleSessionSelectionPanel.bind(this));

                     this.render(options);
                 },

                 render: function(options) {
                     HtmlUtils.setHtml(this.$el, this.tpl(this.entitlementModel.toJSON()));
                     this.delegateEvents();
                     this.updateEnrollBtn();
                 },

                 toggleSessionSelectionPanel: function(e) {
                    /*
                    Opens and closes the session selection panel.
                    */
                    this.$el.toggleClass('hidden');
                    if (!this.$el.hasClass('hidden')){
                        // Set focus to the session selection for a11y purposes
                        this.$('.session-select').focus();
                        this.$('.enroll-btn-initial').popover('hide');
                    }
                    this.updateEnrollBtn();
                 },

                 formatDates: function(sessionData) {
                    /*
                    Updates a passed in data object with a localized string representing the start and end
                    dates for a particular course session.
                    */
                    var startDate, startDateString, isCurrentlyEnrolled;
                    for (var i = 0; i < sessionData.length; i++) {
                        isCurrentlyEnrolled = (sessionData[i].session_id)
                        startDate = sessionData[i].session_start;
                        startDateString = startDate ? (new Date(startDate)).toLocaleDateString() : '';
                        sessionData[i].session_dates = sessionData[i].session_end ? startDateString + gettext(" to ")
                            + (new Date(sessionData[i].session_end)).toLocaleDateString() : gettext("Starts ")
                            + startDateString;
                    }
                    return sessionData;
                 },

                 handleEnrollChange: function(e) {
                    this.currentSessionSelection = this.$('.session-select').find('option:selected').data('session_id');

                    if (this.$('.enroll-btn-initial').hasClass('disabled')) {
                        return;
                    }

                    if (!this.currentSessionSelection) {
                        alert("We want to unenroll the user!");
                        return;
                    }

                    // Display the indicator icon
                    this.$dateDisplayField.html('<span class="fa fa-spinner fa-spin"></span>');

                    $.ajax({
                        type: 'POST',
                        url: this.enrollUrl,
                        contentType: 'application/json',
                        dataType: 'json',
                        data: JSON.stringify({
                            course_details: {
                              course_id: this.currentSessionSelection,
                              course_uuid: this.entitlementModel.get('entitlementUUID'),
                            }
                          }),
                        success: _.bind(this.enrollSuccess, this),
                        error: _.bind(this.enrollError, this),
                    });
                 },

                 enrollSuccess: function(data) {
                    // Update the model with the new session Id
                    this.entitlementModel.set({currentSessionId: this.currentSessionSelection});

                    // Update external elements on the course card to represent the now available course session
                    this.$triggerOpenBtn.removeClass('hidden');
                    this.$dateDisplayField.html(this.$('.session-select').val());
                    // TODO: get this to be a real string pointing to the course
                    this.$enterCourseBtn.attr('href','#');
                    this.$enterCourseBtn.removeClass('hidden');
                    this.$dateDisplayField.prepend('<span class="fa fa-check"></span>');

                    // Reload the session selection panel and close it
                    this.render(this.entitlementModel.toJSON());
                    this.toggleSessionSelectionPanel();
                 },

                 enrollError: function(data) {
                    this.$dateDisplayField.find('.fa.fa-spin').removeClass('fa-spin fa-spinner').addClass('fa-close');
                    this.$dateDisplayField.append(gettext('There was an error, please reload the page and try again.'));
                    this.hideVerificationDialog();
                 },

                 updateEnrollBtn: function() {
                    /*
                    This function plays three crucial roles:
                    1) Enables and disables enroll button
                    2) Changes text to describe the action taken
                    3) Formats the confirmation popover to allow for two step authentication
                    */
                     var enrollText,
                        confirmationHTML;
                     var currentSessionId = this.entitlementModel.get('currentSessionId');
                     var newSessionId = this.$('.session-select').find('option:selected').data('session_id');
                     var enrollBtnInitial = this.$('.enroll-btn-initial');

                     // Disable the button if the user is already enrolled in that session.
                     if (currentSessionId == newSessionId) {
                        enrollBtnInitial.addClass('disabled');
                        enrollBtnInitial.popover('dispose');
                        return;
                     }
                     enrollBtnInitial.removeClass('disabled');

                     // Update the button text based on whether the user is initially enrolling or changing session.
                     if (newSessionId) {
                         enrollText = currentSessionId ? gettext('Change Session') : gettext('Enroll in Session');
                     } else {
                         enrollText = gettext("Leave Current Session");
                     }
                     this.$('.enroll-btn-initial').text(enrollText);

                     // Update the button popover to enable two step authentication.
                     if (newSessionId) {
                         confirmationHTML = currentSessionId ?
                             gettext('Are you sure that you would like to switch session?') + '<br><br>' +
                             gettext(' Please know that by choosing to switch session you will lose any progress you' +
                             'have made in this session.') :
                             gettext('Are you sure that you would like to enroll in this session?');
                     } else {
                         confirmationHTML = gettext('Are you sure that you would like to leave this session?') +
                         '<br><br>' + gettext('Please know that by leaving you will lose any progress you had' +
                         ' made in this session.');
                     }
                     enrollBtnInitial.popover('dispose');
                     enrollBtnInitial.popover({
                        placement: 'bottom',
                        container: this.$el,
                        html: true,
                        trigger: 'click',
                        content: '<div class="verification-modal" role="dialog"' +
                            'aria-labelledby="enrollment-verification-title">' +
                            '<p id="enrollment-verification-title">' + confirmationHTML + '</p>' +
                            '<div class="action-items">' +
                            '<button type="button" class="popover-dismiss final-confirmation-btn" tabindex="0">' +
                            gettext('No') + '</button>' +
                            '<button type="button" class="enroll-btn final-confirmation-btn" tabindex="0">' +
                            gettext('Yes') + '</button>' +
                            '</div>' + '</div>'
                    });

                    // Ensure that focus moves to the popover on click of the initial change enrollment button.
                    this.$('.enroll-btn-initial').on('click', function() {
                        $(this).closest('.course-entitlement-selection-container')
                            .find('.final-confirmation-btn:first').focus();
                    });
                 },

                 handleVerificationPopoverA11y: function(e) {
                    /* Ensure that the second step verification popover is treated as an a11y compliant dialog */
                    var nextButton;
                    var openButton = $(e.target).closest('.course-entitlement-selection-container')
                        .find('.enroll-btn-initial');
                    if (e.key == 'Tab') {
                        e.preventDefault();
                        nextButton = $(e.target).is(':first-child') ? $(e.target).next('.final-confirmation-btn') :
                            $(e.target).prev('.final-confirmation-btn');
                        nextButton.focus();
                    } else if (e.key == 'Escape') {
                        openButton.popover('hide');
                        openButton.focus();
                    }
                 },

                 hideVerificationDialog: function() {
                   this.$('.enroll-btn-initial').focus().popover('hide');
                 },
             });
         }
    );
}).call(this, define || RequireJS.define);
