class Node {
    constructor (value) {
        this.value = valuel
        this.left = null;
        this.right = null;
    }
}

class BinaryTree {
    constructor (value = undefined) {
        this.root = value ? new Node(value) : null;
    }

    insert (value) {
        if (!this.root) {
            this.root = new Node(value);
            return this;
        }

        const node = new Node(value);
        const prev = this.root;

        while (true) {
            if (node.value < prev.value) {
                if (!prev.left) {
                    prev.left = node;
                    return this;
                } else {
                    prev = prev.left;
                }
            } else {
                // go right when node.value is >= prev.value
                if (!prev.right) {
                    prev.right = node;
                    return this;
                } else {
                    prev = prev.right;
                }
            }
        }
    }
}