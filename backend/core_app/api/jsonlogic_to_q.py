"""
Translate a *JsonLogic* rule tree into a Django ORM ``Q`` object.

Supported operators
-------------------
Logical:  ``and``, ``or``, ``!`` (not)
Comparison:  ``==``, ``!=``, ``>``, ``>=``, ``<``, ``<=``
Membership:  ``in``

The ``var`` operator resolves field references.  Only the following
variable names are allowed (mapped to :class:`api.models.TrackingData`
columns):

- ``behavior``  →  ``behavior``
- ``timestamp`` →  ``timestamp``
- ``cow_id``    →  ``cow_id``

Example input::

    {
      "and": [
        {"==": [{"var": "behavior"}, "feeding"]},
        {">=": [{"var": "timestamp"}, 1769124135]},
        {"<=": [{"var": "timestamp"}, 1769124155]}
      ]
    }

Produces::

    Q(behavior="feeding") & Q(timestamp__gte=1769124135) & Q(timestamp__lte=1769124155)
"""

from __future__ import annotations

from django.db.models import Q
from rest_framework.exceptions import ValidationError

# Variables the client is allowed to reference via {"var": "<name>"}.
ALLOWED_VARS: set[str] = {"behavior", "timestamp", "cow_id"}

# Map JsonLogic comparison operators → Django field lookups.
_CMP_LOOKUP: dict[str, str] = {
    "==": "exact",
    "!=": "exact",     # handled specially (negated)
    ">": "gt",
    ">=": "gte",
    "<": "lt",
    "<=": "lte",
}


def _resolve_var(node: object) -> str | None:
    """Return the variable name if *node* is ``{"var": "<field>"}``."""
    if isinstance(node, dict) and list(node.keys()) == ["var"]:
        name = node["var"]
        if name not in ALLOWED_VARS:
            raise ValidationError(f"Unknown variable: {name!r}.  Allowed: {ALLOWED_VARS}")
        return name
    return None


def jsonlogic_to_q(logic: dict) -> Q:
    """Recursively convert a JsonLogic rule dict to a Django ``Q`` object.

    Raises :class:`rest_framework.exceptions.ValidationError` when the
    input contains unsupported operators or invalid variable names.
    """
    if not isinstance(logic, dict) or len(logic) != 1:
        raise ValidationError("Each JsonLogic node must be a dict with exactly one operator key.")

    operator = next(iter(logic))
    args = logic[operator]

    # -- Logical combinators --------------------------------------------------
    if operator == "and":
        if not isinstance(args, list) or len(args) < 2:
            raise ValidationError("'and' requires a list of at least 2 sub-rules.")
        result = jsonlogic_to_q(args[0])
        for sub in args[1:]:
            result &= jsonlogic_to_q(sub)
        return result

    if operator == "or":
        if not isinstance(args, list) or len(args) < 2:
            raise ValidationError("'or' requires a list of at least 2 sub-rules.")
        result = jsonlogic_to_q(args[0])
        for sub in args[1:]:
            result |= jsonlogic_to_q(sub)
        return result

    if operator == "!":
        # Negation – single operand (could be a list with one item or a dict).
        operand = args[0] if isinstance(args, list) else args
        return ~jsonlogic_to_q(operand)

    # -- Comparison operators -------------------------------------------------
    if operator in _CMP_LOOKUP:
        if not isinstance(args, list) or len(args) != 2:
            raise ValidationError(f"'{operator}' requires exactly 2 arguments.")

        left, right = args

        # Determine which side holds the var and which the literal value.
        var_name = _resolve_var(left)
        if var_name is not None:
            value = right
        else:
            var_name = _resolve_var(right)
            if var_name is None:
                raise ValidationError(
                    f"At least one argument of '{operator}' must be a {{\"var\": \"…\"}} reference."
                )
            value = left

        lookup = _CMP_LOOKUP[operator]
        q = Q(**{f"{var_name}__{lookup}": value})
        return ~q if operator == "!=" else q

    # -- Membership -----------------------------------------------------------
    if operator == "in":
        if not isinstance(args, list) or len(args) != 2:
            raise ValidationError("'in' requires exactly 2 arguments.")

        left, right = args
        var_name = _resolve_var(left)
        if var_name is not None:
            # {"in": [{"var": "behavior"}, ["feeding", "drinking"]]}
            if not isinstance(right, list):
                raise ValidationError("The second argument of 'in' must be a list of values.")
            return Q(**{f"{var_name}__in": right})

        var_name = _resolve_var(right)
        if var_name is not None:
            # {"in": ["feeding", {"var": "behavior"}]}  — substring check
            return Q(**{f"{var_name}__contains": left})

        raise ValidationError("At least one argument of 'in' must be a {\"var\": \"…\"} reference.")

    raise ValidationError(f"Unsupported JsonLogic operator: {operator!r}")
