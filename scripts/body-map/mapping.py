"""The atlas's muscles, mapped to the twenty built-in muscle groups (ADR-0060).

Keys are the groups' `body_part` (fitness.muscle_groups). Patterns match an
atlas object's name, lower-cased, without its side (".l", ".r"). The first
group that matches wins; a muscle no group matches stays the body's colour.
"""

GROUPS: list[tuple[str, str]] = [
    ('chest', r'pectoralis major'),
    ('front_delts', r'^clavicular part of deltoid'),
    ('lateral_delts', r'^acromial part of deltoid'),
    ('rear_delts', r'spinal part of deltoid'),
    ('triceps', r'triceps brachii'),
    ('lats', r'latissimus dorsi|teres major'),
    ('traps', r'trapezius'),
    ('biceps', r'biceps brachii'),
    ('brachialis', r'^brachialis muscle'),
    (
        'forearms',
        r'brachioradialis|carpi|palmaris longus|pronator teres|^extensor digitorum$'
        r'|extensor digiti minimi|abductor pollicis longus|extensor pollicis'
        r'|flexor digitorum superficialis|anconeus',
    ),
    ('abs', r'rectus abdominis'),
    ('obliques', r'external (abdominal )?oblique'),
    ('erectors', r'iliocostalis lumborum|iliocostalis thoracis|longissimus thoracis|spinalis thoracis'),
    ('glutes', r'gluteus maximus'),
    ('quads', r'rectus femoris|vastus'),
    ('hamstrings', r'biceps femoris|semitendinosus|semimembranosus muscle'),
    ('adductors', r'adductor (longus|brevis|magnus)|gracilis|pectineus'),
    ('abductors', r'gluteus medius|tensor fasciae latae'),
    ('calves', r'gastrocnemius|soleus'),
    ('tibialis', r'tibialis anterior'),
]

# Atlas objects never shown: sheets, sacs and bands that would hide a muscle.
HIDDEN = (
    r'fascia(?!e latae)|bursa|aponeurosis|sheath|platysma|retinaculum|tendon|ligament'
    r'|cross section|septum|galea|iliotibial tract|serratus posterior'
)

# Parts of muscles cut away so the muscle under them shows, as fitness
# figures draw it: (atlas names, the cut's box in metres: |x| below, z between).
#  - The obliques' and transversus's sheets over the abs.
#  - The lat's sheet over the lumbar erectors.
CUTS: list[tuple[str, dict[str, float]]] = [
    (
        r'(external|internal) (abdominal )?oblique|transversus abdominis',
        {'abs_x_max': 0.08, 'z_min': 0.0, 'z_max': 2.0},
    ),
    (r'latissimus dorsi', {'abs_x_max': 0.085, 'z_min': 0.0, 'z_max': 1.13}),
]

# Upper-limb muscles, which turn with the arm when the figure is posed;
# anything else whose middle is this far from the midline turns too.
ARM = r'deltoid|biceps brachii|triceps|brachialis|coracobrachialis'
ARM_X = 0.175
# The shoulder joint the arms turn about (metres: |x|, z).
SHOULDER = (0.17, 1.36)
# The eyes, as spheres in the skin's empty sockets (metres: |x|, y, z, r).
EYE = (0.031, -0.066, 1.594, 0.0125)

# Skin regions kept as skin: the head, hands and feet. The rest of the skin
# is shrunk behind the muscles, as the body that fills the gaps between them.
SKIN_SURFACE = (
    r'^(frontal|parietal|occipital|temporal|orbital|infra-orbital|nasal|oral|buccal|zygomatic'
    r'|mental|mastoid|parotideomasseteric|auricular) region|nose|auricle|helix|tragus|concha'
    r'|scapha|antihelix|antihelica|eyebrow|philtrum|mouth|labial|lip\b|^chin|^cheek|hand|^palm'
    r'|digits|nail|perionyx|foot|^sole|heel|metatarsal|hallucial|malleol|ankle|wrist|eminentia'
    r'|triangular fossa|incisure|crura|nasolabial|mentolabial|auricular (groove|tubercle)|eyelid'
)
SKIN_DROPPED = r'hairs|eyelash|cross section|pubic'
