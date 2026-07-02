/**
 * Indian college email domain → college name mapping.
 *
 * Usage:
 *   isCollegeEmail('student@iitb.ac.in')  → true
 *   getCollegeName('student@iitb.ac.in')  → 'IIT Bombay'
 *   getCollegeInfo('student@iitb.ac.in')  → { isCollege: true, name: 'IIT Bombay', domain: 'iitb.ac.in' }
 */

// ── Known college domains ──────────────────────────────────────────────
const COLLEGE_DOMAINS = {
    // IITs
    "iitb.ac.in": "IIT Bombay",
    "iitd.ac.in": "IIT Delhi",
    "iitm.ac.in": "IIT Madras",
    "iitk.ac.in": "IIT Kanpur",
    "iitkgp.ac.in": "IIT Kharagpur",
    "iitg.ac.in": "IIT Guwahati",
    "iitr.ac.in": "IIT Roorkee",
    "iith.ac.in": "IIT Hyderabad",
    "iitbbs.ac.in": "IIT Bhubaneswar",
    "iitgn.ac.in": "IIT Gandhinagar",
    "iiti.ac.in": "IIT Indore",
    "iitj.ac.in": "IIT Jodhpur",
    "iitp.ac.in": "IIT Patna",
    "iitrpr.ac.in": "IIT Ropar",
    "iitmandi.ac.in": "IIT Mandi",
    "iitpkd.ac.in": "IIT Palakkad",
    "iitbhilai.ac.in": "IIT Bhilai",
    "iitgoa.ac.in": "IIT Goa",
    "iitjammu.ac.in": "IIT Jammu",
    "iitdh.ac.in": "IIT Dharwad",
    "iitism.ac.in": "IIT (ISM) Dhanbad",

    // NITs
    "nitk.ac.in": "NIT Karnataka (Surathkal)",
    "nitt.edu": "NIT Tiruchirappalli",
    "nitw.ac.in": "NIT Warangal",
    "mnnit.ac.in": "MNNIT Allahabad",
    "nitc.ac.in": "NIT Calicut",
    "svnit.ac.in": "SVNIT Surat",
    "vnit.ac.in": "VNIT Nagpur",
    "manit.ac.in": "MANIT Bhopal",
    "nitdgp.ac.in": "NIT Durgapur",
    "nitrr.ac.in": "NIT Raipur",
    "nitrkl.ac.in": "NIT Rourkela",
    "nits.ac.in": "NIT Silchar",
    "nitj.ac.in": "NIT Jalandhar",
    "nitsri.ac.in": "NIT Srinagar",
    "nitp.ac.in": "NIT Patna",
    "nitkkr.ac.in": "NIT Kurukshetra",
    "nith.ac.in": "NIT Hamirpur",
    "nitgoa.ac.in": "NIT Goa",
    "nitm.ac.in": "NIT Meghalaya",
    "nitmz.ac.in": "NIT Mizoram",
    "nitnagaland.ac.in": "NIT Nagaland",
    "nitdelhi.ac.in": "NIT Delhi",
    "nitap.ac.in": "NIT Andhra Pradesh",
    "nitsikkim.ac.in": "NIT Sikkim",
    "nita.ac.in": "NIT Agartala",
    "nituk.ac.in": "NIT Uttarakhand",
    "nitjsr.ac.in": "NIT Jamshedpur",

    // IIITs
    "iiitd.ac.in": "IIIT Delhi",
    "iiit.ac.in": "IIIT Hyderabad",
    "iiita.ac.in": "IIIT Allahabad",
    "iiitkottayam.ac.in": "IIIT Kottayam",
    "iiitl.ac.in": "IIIT Lucknow",
    "iiitdm.ac.in": "IIITDM Jabalpur",
    "iiitdmk.ac.in": "IIITDM Kancheepuram",

    // Delhi University & colleges
    "du.ac.in": "Delhi University",
    "dtu.ac.in": "Delhi Technological University",
    "nsut.ac.in": "Netaji Subhas University of Technology",
    "igdtuw.ac.in": "IGDTUW Delhi",
    "ipu.ac.in": "Guru Gobind Singh Indraprastha University",
    "jnu.ac.in": "Jawaharlal Nehru University",
    "jamiahamdard.ac.in": "Jamia Hamdard",
    "jmi.ac.in": "Jamia Millia Islamia",

    // BITS
    "bits-pilani.ac.in": "BITS Pilani",
    "pilani.bits-pilani.ac.in": "BITS Pilani (Pilani Campus)",
    "goa.bits-pilani.ac.in": "BITS Pilani (Goa Campus)",
    "hyderabad.bits-pilani.ac.in": "BITS Pilani (Hyderabad Campus)",

    // Other top institutions
    "thapar.edu": "Thapar Institute of Engineering & Technology",
    "vit.ac.in": "VIT Vellore",
    "vitstudent.ac.in": "VIT Vellore (Student)",
    "srmist.edu.in": "SRM Institute of Science & Technology",
    "manipal.edu": "Manipal Institute of Technology",
    "pes.edu": "PES University",
    "iisc.ac.in": "Indian Institute of Science, Bangalore",
    "isical.ac.in": "Indian Statistical Institute",

    // Central universities
    "bhu.ac.in": "Banaras Hindu University",
    "amu.ac.in": "Aligarh Muslim University",
    "uohyd.ac.in": "University of Hyderabad",
    "cusat.ac.in": "Cochin University of Science & Technology",

    // State tech universities
    "aktu.ac.in": "APJ Abdul Kalam Technical University",
    "wbut.ac.in": "Maulana Abul Kalam Azad University of Technology",
    "gtu.ac.in": "Gujarat Technological University",
    "makaut.ac.in": "MAKAUT West Bengal",
};

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Extract the domain portion from an email address.
 * Returns lowercase trimmed domain or null.
 */
function extractDomain(email) {
    if (!email || typeof email !== "string") return null;
    const parts = email.toLowerCase().trim().split("@");
    return parts.length === 2 ? parts[1] : null;
}

/**
 * Check if an email belongs to a known Indian college.
 *
 * Detection strategy (ordered):
 *  1. Exact match against COLLEGE_DOMAINS
 *  2. Parent-domain match  (e.g. cs.iitb.ac.in  → iitb.ac.in)
 *  3. Wildcard: any domain ending in .ac.in  or .edu.in
 */
export function isCollegeEmail(email) {
    const domain = extractDomain(email);
    if (!domain) return false;

    // 1. Exact match
    if (COLLEGE_DOMAINS[domain]) return true;

    // 2. Sub-domain walk  (student.cs.iitb.ac.in → cs.iitb.ac.in → iitb.ac.in)
    const segments = domain.split(".");
    for (let i = 1; i < segments.length - 1; i++) {
        const parent = segments.slice(i).join(".");
        if (COLLEGE_DOMAINS[parent]) return true;
    }

    // 3. Generic Indian academic domain
    if (domain.endsWith(".ac.in") || domain.endsWith(".edu.in")) return true;

    return false;
}

/**
 * Return the human-readable college name for a given email.
 * Returns the matched name from COLLEGE_DOMAINS, a generated name
 * for unknown .ac.in / .edu.in domains, or null.
 */
export function getCollegeName(email) {
    const domain = extractDomain(email);
    if (!domain) return null;

    // Exact match
    if (COLLEGE_DOMAINS[domain]) return COLLEGE_DOMAINS[domain];

    // Sub-domain walk
    const segments = domain.split(".");
    for (let i = 1; i < segments.length - 1; i++) {
        const parent = segments.slice(i).join(".");
        if (COLLEGE_DOMAINS[parent]) return COLLEGE_DOMAINS[parent];
    }

    // Generic academic — derive a readable name from the domain
    if (domain.endsWith(".ac.in") || domain.endsWith(".edu.in")) {
        const institution = domain
            .replace(/\.(ac|edu)\.in$/, "")
            .split(".")
            .pop();
        return institution
            ? institution.charAt(0).toUpperCase() +
                  institution.slice(1) +
                  " (Academic Institution)"
            : "Academic Institution";
    }

    return null;
}

/**
 * All-in-one helper — returns a structured object for a given email.
 *
 * @param  {string} email
 * @return {{ isCollege: boolean, name: string|null, domain: string|null }}
 */
export function getCollegeInfo(email) {
    const domain = extractDomain(email);
    return {
        isCollege: isCollegeEmail(email),
        name: getCollegeName(email),
        domain,
    };
}

/**
 * Get the full domain map — useful for admin UIs or autocomplete.
 */
export function getAllCollegeDomains() {
    return { ...COLLEGE_DOMAINS };
}
