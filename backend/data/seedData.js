const seedLeads = [
  {
    placeId: 'gmb_miami_roofing_001',
    businessName: 'Apex Roofing & Waterproofing',
    avatarUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=150&auto=format&fit=crop&q=80',
    rating: 3.2,
    reviewCount: 48,
    phoneNumber: '+1 (305) 555-0142',
    email: 'contact@apexroofingmiami.com',
    website: 'https://www.apexroofingmiami.com',
    address: '1420 Brickell Ave, Miami, FL 33131',
    area: 'Miami, FL',
    category: 'Roofing',
    registeredDate: new Date('2026-06-15'),
    callStatus: 'Shows Interest',
    callNotes: [
      {
        note: 'Spoke with operations director Mike. Interested in website redesign and high-ticket commercial lead acquisition.',
        timestamp: new Date('2026-08-10T14:30:00Z'),
        author: 'MegaTrix Outbound Desk'
      }
    ],
    emailSentCount: 1,
    emailHistory: [
      {
        sentAt: new Date('2026-08-11T09:00:00Z'),
        status: 'sent',
        templateName: 'Website Modernization & SEO Audit',
        subject: 'Quick question regarding Apex Roofing & Waterproofing website'
      }
    ]
  },
  {
    placeId: 'gmb_miami_roofing_002',
    businessName: 'Biscayne Shingle & Tile Pros',
    avatarUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=150&auto=format&fit=crop&q=80',
    rating: 2.8,
    reviewCount: 19,
    phoneNumber: '+1 (305) 555-0189',
    email: 'info@biscayneroofpros.net',
    website: '',
    address: '8800 Biscayne Blvd, Miami, FL 33138',
    area: 'Miami, FL',
    category: 'Roofing',
    registeredDate: new Date('2026-07-20'),
    callStatus: 'Follow Up',
    followUpDate: new Date('2026-08-20T15:00:00Z'),
    callNotes: [
      {
        note: 'Receptionist said owner Carlos is on a roof job site until Thursday. Requested callback at 3 PM.',
        timestamp: new Date('2026-08-16T11:15:00Z'),
        author: 'MegaTrix Outbound Desk'
      }
    ],
    emailSentCount: 0,
    emailHistory: []
  },
  {
    placeId: 'gmb_austin_dental_001',
    businessName: 'Austin Modern Dentistry & Implants',
    avatarUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewCount: 142,
    phoneNumber: '+1 (512) 555-0391',
    email: 'office@austinmoderndental.com',
    website: 'https://www.austinmoderndental.com',
    address: '3200 S Congress Ave, Austin, TX 78704',
    area: 'Austin, TX',
    category: 'Dentists',
    registeredDate: new Date('2025-11-10'),
    callStatus: 'Lead / Sale',
    callNotes: [
      {
        note: 'Dr. Sarah Davis signed up for 6-month growth retainer package ($2,500/mo). Deal converted!',
        timestamp: new Date('2026-08-14T16:45:00Z'),
        author: 'MegaTrix Executive Closer'
      }
    ],
    emailSentCount: 2,
    emailHistory: [
      {
        sentAt: new Date('2026-08-01T10:00:00Z'),
        status: 'sent',
        templateName: 'Google Reviews & Reputation Accelerator',
        subject: 'Accelerating 5-Star Reviews for Austin Modern Dentistry'
      },
      {
        sentAt: new Date('2026-08-08T11:30:00Z'),
        status: 'sent',
        templateName: 'Direct Cold Calling Follow-Up Deck',
        subject: 'Proposal Deck for Dr. Davis'
      }
    ]
  },
  {
    placeId: 'gmb_austin_dental_002',
    businessName: 'Capital City Smile Studio',
    avatarUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=150&auto=format&fit=crop&q=80',
    rating: 2.9,
    reviewCount: 31,
    phoneNumber: '+1 (512) 555-0922',
    email: 'frontdesk@capsmilestudio.com',
    website: '',
    address: '1100 E 7th St, Austin, TX 78702',
    area: 'Austin, TX',
    category: 'Dentists',
    registeredDate: new Date('2026-06-28'),
    callStatus: 'Uncontacted',
    callNotes: [],
    emailSentCount: 0,
    emailHistory: []
  },
  {
    placeId: 'gmb_chicago_plumbing_001',
    businessName: 'Windy City Emergency Plumbing',
    avatarUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=150&auto=format&fit=crop&q=80',
    rating: 3.1,
    reviewCount: 27,
    phoneNumber: '+1 (312) 555-0711',
    email: 'service@windycityplumbpros.com',
    website: 'https://www.windycityplumbpros.com',
    address: '2400 N Clark St, Chicago, IL 60614',
    area: 'Chicago, IL',
    category: 'Plumbing',
    registeredDate: new Date('2026-05-18'),
    callStatus: 'IVR',
    callNotes: [
      {
        note: 'Automated 24/7 emergency dispatch switchboard. Pressed 2 for management, voicemail box full.',
        timestamp: new Date('2026-08-12T10:20:00Z'),
        author: 'MegaTrix Outbound Desk'
      }
    ],
    emailSentCount: 1,
    emailHistory: []
  },
  {
    placeId: 'gmb_chicago_plumbing_002',
    businessName: 'Midwest Hydro Jetting & Drain Co',
    avatarUrl: 'https://images.unsplash.com/photo-1505798577917-a65157d3320a?w=150&auto=format&fit=crop&q=80',
    rating: 2.6,
    reviewCount: 14,
    phoneNumber: '+1 (312) 555-0844',
    email: 'info@midwesthydrodrain.net',
    website: '',
    address: '4500 S Michigan Ave, Chicago, IL 60653',
    area: 'Chicago, IL',
    category: 'Plumbing',
    registeredDate: new Date('2026-07-02'),
    callStatus: 'Receptionist',
    callNotes: [
      {
        note: 'Receptionist Brenda said they do not take unsolicited calls. Refused to transfer to owner Dave.',
        timestamp: new Date('2026-08-15T13:40:00Z'),
        author: 'MegaTrix Outbound Desk'
      }
    ],
    emailSentCount: 0,
    emailHistory: []
  },
  {
    placeId: 'gmb_houston_remodel_001',
    businessName: 'Lone Star Kitchen & Bath Remodeling',
    avatarUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=150&auto=format&fit=crop&q=80',
    rating: 3.4,
    reviewCount: 52,
    phoneNumber: '+1 (713) 555-0988',
    email: 'estimates@lonestarremodelhtx.com',
    website: 'https://www.lonestarremodelhtx.com',
    address: '6200 Richmond Ave, Houston, TX 77057',
    area: 'Houston, TX',
    category: 'Remodeling',
    registeredDate: new Date('2026-04-10'),
    callStatus: 'Shows Interest',
    callNotes: [
      {
        note: 'Owner Robert interested in targeting homeowners in River Oaks with $50k+ kitchen budgets.',
        timestamp: new Date('2026-08-16T15:10:00Z'),
        author: 'MegaTrix Outbound Desk'
      }
    ],
    emailSentCount: 1,
    emailHistory: []
  },
  {
    placeId: 'gmb_houston_remodel_002',
    businessName: 'Bayou City Custom Renovations',
    avatarUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&auto=format&fit=crop&q=80',
    rating: 4.1,
    reviewCount: 68,
    phoneNumber: '+1 (713) 555-0329',
    email: 'hello@bayoucustomreno.com',
    website: 'https://www.bayoucustomreno.com',
    address: '1900 Heights Blvd, Houston, TX 77008',
    area: 'Houston, TX',
    category: 'Remodeling',
    registeredDate: new Date('2026-01-20'),
    callStatus: 'Do Not Call',
    callNotes: [
      {
        note: 'Requested strict DNC removal. Added to permanent exclusion list.',
        timestamp: new Date('2026-08-05T09:12:00Z'),
        author: 'MegaTrix Outbound Desk'
      }
    ],
    emailSentCount: 3,
    emailHistory: []
  },
  {
    placeId: 'gmb_denver_solar_001',
    businessName: 'Mile High Clean Energy Systems',
    avatarUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=150&auto=format&fit=crop&q=80',
    rating: 3.0,
    reviewCount: 22,
    phoneNumber: '+1 (720) 555-0455',
    email: 'proposals@milehighsolarco.com',
    website: '',
    address: '1600 Broadway, Denver, CO 80202',
    area: 'Denver, CO',
    category: 'Solar',
    registeredDate: new Date('2026-07-11'),
    callStatus: 'Uncontacted',
    callNotes: [],
    emailSentCount: 0,
    emailHistory: []
  },
  {
    placeId: 'gmb_seattle_hvac_001',
    businessName: 'Pacific Northwest Heating & Air',
    avatarUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80',
    rating: 3.3,
    reviewCount: 39,
    phoneNumber: '+1 (206) 555-0677',
    email: 'dispatch@pnwheatair.com',
    website: 'https://www.pnwheatair.com',
    address: '400 Pine St, Seattle, WA 98101',
    area: 'Seattle, WA',
    category: 'HVAC',
    registeredDate: new Date('2026-06-01'),
    callStatus: 'Uncontacted',
    callNotes: [],
    emailSentCount: 0,
    emailHistory: []
  },
  {
    placeId: 'gmb_phoenix_pool_001',
    businessName: 'Desert Oasis Pool Building & Design',
    avatarUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=150&auto=format&fit=crop&q=80',
    rating: 2.7,
    reviewCount: 18,
    phoneNumber: '+1 (602) 555-0819',
    email: 'contact@desertoasispools.com',
    website: '',
    address: '2400 E Camelback Rd, Phoenix, AZ 85016',
    area: 'Phoenix, AZ',
    category: 'Pool Builder',
    registeredDate: new Date('2026-07-29'),
    callStatus: 'Uncontacted',
    callNotes: [],
    emailSentCount: 0,
    emailHistory: []
  },
  {
    placeId: 'gmb_atlanta_legal_001',
    businessName: 'Peachtree Business Law Partners',
    avatarUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=150&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 88,
    phoneNumber: '+1 (404) 555-0933',
    email: 'partners@peachtreelaw.com',
    website: 'https://www.peachtreelaw.com',
    address: '3344 Peachtree Rd NE, Atlanta, GA 30326',
    area: 'Atlanta, GA',
    category: 'Legal',
    registeredDate: new Date('2025-09-14'),
    callStatus: 'Follow Up',
    followUpDate: new Date('2026-08-22T10:00:00Z'),
    callNotes: [
      {
        note: 'Managing partner Mark requested enterprise deck for local litigation marketing.',
        timestamp: new Date('2026-08-15T16:00:00Z'),
        author: 'MegaTrix Outbound Desk'
      }
    ],
    emailSentCount: 1,
    emailHistory: []
  }
];

module.exports = seedLeads;
