'use strict';
const numeral_literal = process.argv[2];

const numeral_base_10_map = {
    "I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000,
};

const token_types = {
    DIGIT: "digit", 
    OPERATOR: "operator",
    L_PARENS: "l_parens",
    R_PARENS: "r_parens",
};

// Operator precedence borrowed from JS specifications as outlined on MDN; however, at this stage, 
// any "precedence" value is arbitrary to some degree as long as the correct precedents are shared.
// As we aren't doing anything sophisticated (necessarily) with operators, only existing assoc. is
// "left".
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
const operator_precedence_and_evaluator_map = {
    "*": {
        // "associativity" is fancy math speak for evaluation 
        // when read without parenthesis, e.g. (from left to right)
        associativity: "left",
        precedence: 15,
        evaluate: function (x, y) {
            return Number(x) * Number(y);
        },
    }, 
    "/": {
        associativity: "left",
        precedence: 15,
        evaluate: function (x, y) {
            return Number(x) / Number(y);
        },
    }, 
     "+": { 
        associativity: "left", 
        precedence: 14,
        evaluate: function (x, y) {
            return Number(x) + Number(y);
        },
    }, 
    "-": {
        associativity: "left",
        precedence: 14,
        evaluate: function (x, y) {
            return Number(x) - Number(y);
        },
     },
};

const is_number = (character) => {
    return /\d/.test(character);
};

const is_operator = (character) => {
    return /\+|-|\*|\/|\^/.test(character);
};

const is_left_parens = (ch) => {
	return /\(/.test(ch);
};

const is_right_parens = (ch) => {
	return /\)/.test(ch);
};

const determine_token_type =(value) => {
    // can care about a lesser set of things (e.g. no "." as we are dealing with ints);
    // this is - theoretically - less efficient than a class for any compiler-based 
    // optimizations by the JIT as structure can't be predicted.
    if (is_number(value)) { 
        return token_types.DIGIT;
    } else if (is_operator(value)) {
        return token_types.OPERATOR;
    } else if (is_left_parens(value)) {
        return token_types.L_PARENS;
    } else if (is_right_parens(value)) {
        return token_types.R_PARENS;
    }
}

class Token {
    constructor (value) {
        this.value = value;
        this.type = determine_token_type(value);
    }
    
    associativity () {
        return operator_precedence_and_evaluator_map[this.value].associativity;
    }

    precedence () {
        return operator_precedence_and_evaluator_map[this.value].precedence;
    }
}

// peek and add_node could have been assigned to the array prototype for better readability in 
// code making use of the two functions, below (or potentially to their own class altogether). 
// For the sake of time - and length - I didn't do this clean up.
const peek = (arr) => {
    // not as "sexy" as slice(-1)[0] but faster: https://jsperf.com/last-array-element2
    return arr[arr.length - 1];
} 

const add_node = (arr, token) => {
    // fast and dirty way to construct a tree: arr [ { Node Node } ] becomes arr [ { Node < Node, Node }]. 
    const right = arr.pop();
    const left = arr.pop();
    arr.push(new Node(token, left, right));
}

class Node {
    constructor (token, left_node, right_node) {
        this.token = token;
        this.left_node = left_node;
        this.right_node = right_node;
    }
}

const tokenize_expression_elements = (base_10_expression_literal) => {
    // establish a buffer (base_10_buffer_ for long-running numerical conversions as this is much faster in
    // certain engines than string concatentation. for token_candidates remove white space and convert to 
    // array of token "candidates" (uninterpreted characters)
    // https://mattsnider.com/use-a-string-buffer-for-better-performance/
    const tokens = [];
    const base_10_buffer = []; 
    const token_candidates = base_10_expression_literal.replace(/\s+/g, "").split("");
    token_candidates.forEach((character) => {
        const token = new Token(character);

        switch (token.type) {
            case token_types.DIGIT:
                base_10_buffer.push(token.value); 
                break;

            case token_types.OPERATOR:
                collectAndResetNumberBuffer();
                tokens.push(token);
                break;
            case token_types.L_PARENS:
            case token_types.R_PARENS:
                collectAndResetNumberBuffer();
                tokens.push(token);
                break;
            default:
                throw new Error("token type unaccounted for.");
                break;
        }
    });
    
    if (tokens.length) {
        collectAndResetNumberBuffer();
    }

    return tokens;

    // Using function for the sake of hoisting within the tokenize function's
    // execution context; just keeps the "need-to-know" a bit cleaner
    function collectAndResetNumberBuffer() {
        if (base_10_buffer.length) {
            tokens.push({
                type: token_types.DIGIT,
                value: base_10_buffer.join(""),
            });
            
            base_10_buffer.length = 0;
        }
    }
};

const is_operator_precedence_higher_than_token = (token, operators) => {
    // return whether an operator exists; whether it is an operator;
    // && whether it belongs in this classification (left) and whether its
    // precedence remains less than that of the operator "to its right"
    return (
        peek(operators) && peek(operators).type === token_types.OPERATOR
        && (token.associativity() === "left" && token.precedence() <= peek(operators).precedence())
    );
}

const parse_tokens_into_syntax_tree = (tokens) => {
    const operators = []; // stack
    const output = []; // queue

    // We are now translating the tokens into an intelligble data structure: an AST representing
    //  Reverse Polish Notation e.g. [4 3 1 - 1 * 2 -] (3 - 1, 4 2 * 1 - ) (2 * 1, 4 2 -), and 
    // so on. We want to create an AST where a parent is the operation of one-two sibling digits 
    // (or results). Eventually, this structure will be walked from the bottom and orders of op. 
    // will be enforced (using precedence map).
    tokens.forEach((token) => {
        if (token.type === token_types.DIGIT) {
            output.push(new Node(token, null, null));
        } else if (token.type === token_types.OPERATOR) {
            // The only reason for abstracting this out into a function is to improve readability
            // of the expression that results in the continuation of the while loop
            while (is_operator_precedence_higher_than_token(token, operators)) {
                add_node(output, operators.pop());
            }

            operators.push(token);
        } else if (token.type === token_types.L_PARENS) {
            operators.push(token);
        } else if (token.type === token_types.R_PARENS) {
            while (peek(operators) && peek(operators).type !== token_types.L_PARENS) {
                add_node(output, operators.pop());
            }

            operators.pop();
        }
    });

    while (peek(operators)) {
        add_node(output, operators.pop());
    }

    return output.pop();
};

const interpret_tree = (ast_node) => {
    if (ast_node.token.type === token_types.DIGIT) {
        return ast_node.token.value;
    } else {
        const token_1_value = interpret_tree(ast_node.left_node);
        const token_2_value = interpret_tree(ast_node.right_node);
        const operation = operator_precedence_and_evaluator_map[ast_node.token.value];

        return operation.evaluate(token_1_value, token_2_value);
    }
};

const is_roman_numeral = (str) => {
    // one or more of; very simple (more sophisticated checks possible) - for more complex:
    // https://stackoverflow.com/questions/267399/how-do-you-match-only-valid-roman-numerals-with-a-regular-expression
    return /^[MDCLXVI]+$/gmi.test(str); 
}

const convert_numeral_to_base_10 = (numeral) => {
    if (typeof numeral !== "string") {
         // could also throw a call to is_recognized_numeral in here
        throw new Error(`type of numeral:${typeof numeral}: does not match expected type string`);
    }
    const numeral_symbols = numeral.split("");
    let base_10_value = 0;

    numeral_symbols.forEach((value, index, array) => {
        // this syntax is a little gross; effectively it's saying {"I"} where "I" 
        //is the value of array at index +1
        const next_base_10_value = numeral_base_10_map[array[index + 1]];
        const current_base_10_value = numeral_base_10_map[value];
        
        // if the current value being evaluated is _less_ than that after it, we know it is used 
        // as a "subtractor"; otherwise, we know it is a contributor to the overall total - even
        // in cases, e.g. of [L->I] comparison in [XLIX]; or [X->I]; [I->] in [XIII]
        if (current_base_10_value < next_base_10_value) {
            base_10_value -= current_base_10_value;
        } else {
            base_10_value += current_base_10_value;
        }
    });

    return base_10_value;
};

const translate_rn_expression_to_base_10_expression = (expression) => {
    const translated_array = expression.split(" ").map(element => {
        if (is_roman_numeral(element)) {
            return convert_numeral_to_base_10(element);
        }

        return element;
    });

    return translated_array.join(" ");
};

const result = interpret_tree(
   parse_tokens_into_syntax_tree(
       tokenize_expression_elements(
            translate_rn_expression_to_base_10_expression(numeral_literal)
        )
    )
);

console.log(result);
