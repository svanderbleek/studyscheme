export const seeds = [
  {
    id: 'even-implies-odd', name: 'An even expression, an odd integer',
    content: {
      statement: 'Let $m,n \\in \\mathbb{Z}$. Prove that if $2m^2+n+1$ is even, then either $m$ or $n$ is odd.',
      topic: 'Number theory', technique: 'Contrapositive', groups: [],
      blocks: [
        { id: 'b1', text: 'Proof by contrapositive:', depends: [], group: null },
        { id: 'b2', text: 'Take some $m \\in \\mathbb{Z}$.', depends: ['b1'], group: null },
        { id: 'b3', text: 'Take some $n \\in \\mathbb{Z}$.', depends: ['b1'], group: null },
        { id: 'b4', text: 'Assume $m$ is even.', depends: ['b2'], group: null },
        { id: 'b5', text: 'Assume $n$ is even.', depends: ['b3'], group: null },
        { id: 'b6', text: 'There exists $l \\in \\mathbb{Z}$ such that $m=2l$.', depends: ['b4'], group: null },
        { id: 'b7', text: 'There exists $k \\in \\mathbb{Z}$ such that $n=2k$.', depends: ['b5'], group: null },
        { id: 'b8', text: '$2m^2+n+1=2(2l)^2+2k+1=2(4l^2+k)+1$.', depends: ['b6', 'b7'], group: null },
        { id: 'b9', text: 'Since $2(4l^2+k)$ is even, $2(4l^2+k)+1$ is odd.', depends: ['b8'], group: null },
      ],
    },
  },
  {
    id: 'proof-by-cases', name: 'Two cases, one conclusion',
    content: {
      statement: 'Let $A$, $B$, and $C$ be propositions. Prove that $(A \\land C) \\lor (A \\land B) \\rightarrow A$.',
      topic: 'Logic', technique: 'Proof by cases',
      groups: [{ id: 'g1', label: 'First case', depends: ['b1'] }, { id: 'g2', label: 'Second case', depends: ['b1'] }],
      blocks: [
        { id: 'b1', text: 'Proof by cases:', depends: [], group: null },
        { id: 'b2', text: 'Case $A \\land C$:', depends: [], group: 'g1' },
        { id: 'b3', text: 'Since $A \\land C$ is true, we know $A$ is true.', depends: ['b2'], group: 'g1' },
        { id: 'b4', text: 'Case $A \\land B$:', depends: [], group: 'g2' },
        { id: 'b5', text: 'Since $A \\land B$ is true, we know $A$ is true.', depends: ['b4'], group: 'g2' },
        { id: 'b6', text: 'In either case, $A$ is true. This completes the proof.', depends: ['g1', 'g2'], group: null },
      ],
    },
  },
];
