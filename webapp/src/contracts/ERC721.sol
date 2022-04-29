// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract ERC721 {

    event Transfer(
        address indexed from, 
        address indexed to, 
        uint indexed tokenId);

    // Mapping from token id to the owner
    mapping(uint => address) private _tokenOwner;

    // Mapping from owner to number of owned tokens
    mapping(address => uint) private _ownedTokensCount;

    function _exists(uint256 tokenId) internal view returns(bool){
        address owner = _tokenOwner[tokenId];
        // return truthiness that address is not zero
        return owner != address(0);
    }

    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), 'ERC721: minting to the zero address');
        require(!_exists(tokenId), 'ERC721: token already minted');
        _tokenOwner[tokenId] = to;
        _ownedTokensCount[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }

}