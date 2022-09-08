import { Link } from "react-router-dom"
import { Navbar, Nav, Button, Container } from 'react-bootstrap'
import mintybay from './img/mintybay-io-logo.png'

const Navigation = ({ web3Handler, account }) => {

    return (
        <Navbar expand="lg" bg="dark" variant="dark">
            <Container>
                <Navbar.Brand>
                <img src={mintybay} height="60"/></Navbar.Brand>

                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/">Market</Nav.Link>
                        <Nav.Link as={Link} to="/create">Create</Nav.Link>
                        <Nav.Link as={Link} to="/mycollection">My Collection</Nav.Link>
                        <Nav.Link as={Link} to="/settings">Settings</Nav.Link>
                    </Nav>
                    <Nav>
                        {account ? (
                            <Button variant="outline-light">{account.slice(0, 8) + '...' + account.slice(34, 42)}</Button>
                        ) : (
                            <Button onClick={web3Handler} variant="outline-light">Connect Wallet &#x26A1;</Button>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    )
}

export default Navigation;