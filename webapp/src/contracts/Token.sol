// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import './ERC721Connector.sol';

contract Token is ERC721Connector{

    // array to store tokens
    string [] public tokens;

    mapping(string => bool) _tokensExists;

    function mint(string memory _token) public{

        require(!_tokensExists[_token], 'Error - Token already exists');
        tokens.push(_token);
        uint _id = tokens.length - 1;
        _mint(msg.sender, _id);

        _tokensExists[_token] = true;
    }

    constructor() ERC721Connector('ExampleToken', 'EXTOKEN'){}

}