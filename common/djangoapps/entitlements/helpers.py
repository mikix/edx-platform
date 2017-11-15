from datetime import datetime


def is_entitlement_expired(entitlement, policy):
    """
    Determines from the policy if an entitlement can be redeemed, if it has not passed the
    expiration period of policy.expiration_period_days

    :param entitlement:
    :param policy:
    :return:
    """
    return (datetime.utcnow() - entitlement.created).days < policy.expiration_period_days


def is_entitlement_refundable(entitlement, policy):
    """
    Determines from the policy if an entitlement can still be refunded, if the entitlement has not
    yet been redeemed (enrollment_course_run is NULL) and policy.refund_period_days has not yet passed
    :param entitlement:
    :param policy:
    :return:
    """

    return ((datetime.utcnow() - entitlement.created).days < policy.refund_period_days
            and entitlement.entitlement.enrollment_course_run is None)


def is_entitlement_regainable(entitlement, policy):
    """
    Determines from the policy if an entitlement can still be regained by the user, if they choose
    to by leaving and regaining their entitlement within policy.regain_period_days days from start date of
    the course or their redemption, whichever comes later

    :param entitlement:
    :param policy:
    :return:
    """
    # Get the start date of the course
    # Get the entitlement's

    return True
