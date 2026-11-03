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
# figures draw it: (atlas names, the cut in metres). Everything nearer the
# midline than a line from (half-width `top_x`, height `top_z`) down to
# (`bottom_x`, `bottom_z`), and below `top_z`, goes.
#  - The obliques' and transversus's sheets over the abs: a straight edge.
#  - The lat's sheet over the lumbar erectors: a diamond widening downwards,
#    as the lat's own lower border runs.
CUTS: list[tuple[str, dict[str, float]]] = [
    (
        r'(external|internal) (abdominal )?oblique|transversus abdominis',
        {'top_x': 0.08, 'top_z': 2.0, 'bottom_x': 0.08, 'bottom_z': 0.0},
    ),
    (r'latissimus dorsi', {'top_x': 0.0, 'top_z': 1.24, 'bottom_x': 0.1, 'bottom_z': 0.98}),
]

# Upper-limb muscles, which turn with the arm when the figure is posed;
# anything else whose middle is this far from the midline turns too.
ARM = r'deltoid|biceps brachii|triceps|brachialis|coracobrachialis'
ARM_X = 0.175
# The shoulder joint the arms turn about (metres: |x|, z), and the elbow's height.
SHOULDER = (0.17, 1.36)
ELBOW_Z = 1.10
# The twist turns nothing above the first height and all of the arm below the
# second: the whole deltoid turns, so the lateral delt comes round to the front.
TWIST_RAMP = (1.46, 1.30)
# The eyes, as spheres in the skin's empty sockets (metres: |x|, y, z, r), with
# an iris and pupil carved in, as on a statue: (iris, pupil) half-angles in
# degrees and depths in metres.
EYE = (0.031, -0.064, 1.594, 0.0118)
IRIS = ((27, 0.0006), (11, 0.0016))

# Skin regions kept as skin: the head, hands and feet. The rest of the skin
# is shrunk behind the muscles, as the body that fills the gaps between them.
SKIN_SURFACE = (
    r'^(frontal|parietal|occipital|temporal|orbital|infra-orbital|nasal|oral|buccal|zygomatic'
    r'|mental|mastoid|parotideomasseteric|auricular) region|nose|auricle|helix|tragus|concha'
    r'|scapha|antihelix|antihelica|eyebrow|philtrum|mouth|labial|lip\b|^chin|^cheek|hand|^palm'
    r'|digits|nail|perionyx|foot|^sole|heel|metatarsal|hallucial|malleol|ankle|wrist|eminentia'
    r'|triangular fossa|incisure|crura|nasolabial|mentolabial|auricular (groove|tubercle)|eyelid'
)
SKIN_SURFACE += (
    r'|^(muscular|carotid|submandibular|submental) triangle|^sternocleidomastoid region'  # the front of the neck
)
SKIN_DROPPED = r'hairs|eyelash|cross section|pubic'
HAIR = r'^hairs of head$'  # kept, as surface, with render.py --hair

# Muscles in no group that still show on the surface. Every other muscle in no
# group lies deep, and is hidden: the body behind shows through the gaps.
SUPERFICIAL = (
    r'sartorius|serratus anterior|infraspinatus|teres minor|sternocleidomastoid'
    r'|levator scapulae|splenius|fibularis|extensor digitorum longus|flexor digitorum longus'
    r'|extensor hallucis longus|flexor pollicis longus|rhomboid|iliacus|psoas major|omohyoid'
)
