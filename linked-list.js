class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

class LinkedList {
    constructor (value) {
        this.head = new Node(value);
        this.tail = this.head;
        this.length = 1;
    }

    append (value) {
        const node = new Node(value);

        this.tail.next = node;
        this.tail = node;
        this.length++;

        return this;
    }

    prepend (value) {
        const node = new Node(value);

        node.next = this.head;
        this.head = node;
        this.length++;

        return this;
    }

    insert (index, value) {
        // mild input sanity check; account for "edge" cases.
        if (index >= this.length) {
            console.warn(`index ${index} is out of bounds; appending to list`);
            return this.append(value);
        } else if (index === 0) {
            return this.prepend(value);
        }

        const node = new Node(value);
        const prev = this._traverseToIndex(index - 1); // index of "leader" node (prev)
        const next = prev.next;

        prev.next = node;
        node.next = next;

        this.length++;

        return this;
    }

    remove (index) {
        const prev = this._traverseToIndex(index - 1);
        const removeCandidate = this._traverseToIndex (index);
        
        prev.next = removeCandidate.next;

        this.length--;
        
        return this;
    }

    _traverseToIndex (index) {
        let counter = 0;
        let current = this.head;

        while (counter !== index) {
            current = current.next;
            counter++;
        }

        return current;
    }

    toString() {
        // basic traversal demonstration; only node.value will ultimately be printed.
        const array = [];
        let node = this.head;

        while (node !== null) {
            array.push(node.value);
            node = node.next;
        }

        return array;
    }
}

const list = new LinkedList(0);

list
    .append(1)
    .append(2)
    .append(3)
    .append(4);

list.insert(2, 5);

console.log(list.toString());