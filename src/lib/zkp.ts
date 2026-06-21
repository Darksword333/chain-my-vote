import { poseidon1, poseidon2 } from 'poseidon-lite';

// Create a sparse merkle tree implementation for the frontend
export class MerkleTree {
    levels: number;
    zeros: bigint[];
    nodes: Record<number, bigint[]>;

    constructor(levels: number) {
        this.levels = levels;
        this.nodes = {};
        for (let i = 0; i <= levels; i++) {
            this.nodes[i] = [];
        }
        
        // Generate zero hashes
        this.zeros = [0n];
        for (let i = 1; i <= levels; i++) {
            this.zeros[i] = this.hash(this.zeros[i - 1], this.zeros[i - 1]);
        }
    }

    hash(left: bigint, right: bigint): bigint {
        return poseidon2([left, right]);
    }

    insert(leaf: bigint) {
        let currentIndex = this.nodes[0].length;
        this.nodes[0].push(leaf);
        
        let currentLevelHash = leaf;
        for (let level = 1; level <= this.levels; level++) {
            const isRightNode = currentIndex % 2 === 1;
            const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
            
            const siblingHash = siblingIndex < this.nodes[level - 1].length 
                ? this.nodes[level - 1][siblingIndex] 
                : this.zeros[level - 1];

            let left, right;
            if (isRightNode) {
                left = siblingHash;
                right = currentLevelHash;
            } else {
                left = currentLevelHash;
                right = siblingHash;
            }

            currentLevelHash = this.hash(left, right);
            currentIndex = Math.floor(currentIndex / 2);
            this.nodes[level][currentIndex] = currentLevelHash;
        }
    }

    get root(): bigint {
        return this.nodes[this.levels][0] || this.zeros[this.levels];
    }

    getProof(index: number) {
        let currentIndex = index;
        const siblings = [];
        const pathIndices = [];

        for (let level = 0; level < this.levels; level++) {
            const isRightNode = currentIndex % 2 === 1;
            const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
            
            const siblingHash = siblingIndex < this.nodes[level].length 
                ? this.nodes[level][siblingIndex] 
                : this.zeros[level];
            
            siblings.push(siblingHash);
            pathIndices.push(isRightNode ? 1 : 0);
            
            currentIndex = Math.floor(currentIndex / 2);
        }

        return {
            root: this.root,
            leaf: this.nodes[0][index],
            siblings,
            pathIndices
        };
    }
}

export async function computeIdentityCommitment(secret: string): Promise<bigint> {
    const idBigInt = BigInt(secret);
    return poseidon1([idBigInt]);
}

export async function createMerkleTree(secrets: string[]): Promise<MerkleTree> {
    const tree = new MerkleTree(16); // 16 levels as per semaphore_vote.circom
    
    for (const secret of secrets) {
        const commitment = await computeIdentityCommitment(secret);
        tree.insert(commitment);
    }
    
    return tree;
}
